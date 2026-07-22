# Letting users write before signing in

Last reviewed: 22 July 2026

## The idea

Instead of requiring authentication before a user sees the document workflow, Thido could let a visitor begin a draft immediately. After the visitor has experienced some value—for example, after answering the initial questions or requesting the first AI-generated draft—Thido would ask them to create an account or sign in before continuing or saving permanently.

This is often called a **guest-first**, **authentication-delayed**, or **progressive sign-up** flow.

## Advantages

### Lower initial friction

A login page asks for commitment before the visitor understands the product. Letting someone start writing makes Thido's purpose immediately visible and reduces the chance that they leave simply because they do not want to create another account.

### Faster time to value

The visitor can experience the guided drafting workflow before being asked for personal information. The sign-up request then has a concrete reason: preserve and continue the work they have already started.

### Better product demonstration

An interactive document flow communicates more than a marketing page. It lets users evaluate whether Thido's questions, editor, and writing approach suit them.

### Potentially higher registration conversion

A well-timed prompt such as “Create an account to generate and save this document” can convert better than a generic “Create an account” screen because the user has already invested effort and understands what they will receive.

### Easier onboarding

The product can collect the document goal first and postpone account decisions such as Google versus password login. This keeps the user's attention on the writing task.

## Disadvantages

### Risk of losing work

Until a guest draft is associated with an account and stored reliably, refreshing the page, clearing browser storage, changing devices, or an expired session may destroy the visitor's work. A user who loses a draft is likely to trust Thido less than a user who was asked to sign in first.

Thido must make the temporary nature of the draft clear and should not imply that it is safely stored before it actually is.

### More complicated account conversion

After login, Thido must safely transfer the guest draft to the authenticated account. The implementation must handle:

- the user opening several guest tabs;
- the same guest draft being claimed twice;
- login redirects and OAuth callback failures;
- a user signing into a different account than expected;
- expired or already-consumed guest identifiers; and
- merging without exposing one visitor's draft to another visitor.

This is substantially more complex than creating every document with a known `ownerId`.

### Greater abuse and AI cost

If guests can call an AI model before authenticating, attackers can repeatedly clear cookies, change IP addresses, or automate requests. Account-level quotas cannot protect these requests because no verified user identity exists yet.

Allowing guests to enter text locally is relatively low-risk. Allowing anonymous AI generation, email delivery, exports, or persistent database writes is much more expensive and abuse-prone.

### Additional data lifecycle and privacy obligations

If guest content reaches Thido's servers, the product must define how long unclaimed drafts are retained, how they are identified, when they are deleted, and how a visitor can request deletion without an account. Guest identifiers and browser storage also need to be described accurately in the Privacy Policy.

### Weaker cross-device continuity

A guest draft stored in one browser is unavailable on another device. Server-side guest storage can solve this, but it creates security, retention, cleanup, and ownership-transfer work.

### Misleading conversion prompts can damage trust

If Thido waits until after expensive or repetitive input and then unexpectedly blocks the result behind registration, users may feel trapped. The interface should disclose the checkpoint before the user invests substantial effort.

### Harder analytics interpretation

Guest sessions, registered users, abandoned drafts, and converted drafts must be distinguished. Otherwise, activation and retention numbers can become inflated or double-counted.

## Storage approaches

| Approach | Benefits | Drawbacks |
| --- | --- | --- |
| React state only | Simplest; nothing is persisted | Refresh or navigation loses everything |
| Browser `sessionStorage` | Survives navigation and refresh in the same tab; cleared with the tab/session | Not available across tabs or devices; browser scripts can access it |
| Browser `localStorage` | Survives browser restarts; no anonymous server records | Persists sensitive text on the device; must be explicitly cleared; unavailable across devices |
| Encrypted or signed guest cookie | Server can identify a guest without exposing a raw database identifier | Cookies are size-limited, so the document itself should not be stored there |
| Temporary server-side guest draft | More reliable and can survive OAuth redirects | Requires secure guest tokens, expiry, deletion jobs, rate limits, and ownership-claim logic |

## Recommended approach for Thido

Use a **limited guest-first flow**, not fully anonymous document generation.

1. Let a visitor enter the document title, goal, audience, and initial answers before signing in.
2. Keep that information in `sessionStorage` initially. Clearly label it as a temporary draft that has not yet been saved to an account.
3. Tell the visitor early that sign-in will be required to generate, save, or continue the document.
4. Prompt for authentication immediately before the first AI request or permanent database write.
5. After successful Google or password authentication, submit the stored answers to the server and create the real `Document` with the authenticated user's `ownerId`.
6. Clear the guest data only after the authenticated document has been created successfully.
7. If authentication is cancelled or fails, return the visitor to the guest flow with their local answers intact.

This version provides most of the onboarding benefit while avoiding anonymous AI costs and the security complexity of server-side guest documents.

## What should remain behind authentication

For the first version, require an authenticated account for:

- all AI model requests;
- saving a document to PostgreSQL;
- comments and suggestions;
- document history and cross-device access;
- exports and sharing when those features are added; and
- account-specific settings.

## When to display the login prompt

The best checkpoint is immediately before the user requests their first generated draft. At that point, the user has experienced the guided workflow and has a clear reason to continue, but Thido has not yet incurred AI cost or created anonymous server data.

The interface should state this before the visitor begins, for example:

> Start your outline without an account. You will sign in before Thido generates and saves your draft.

At the checkpoint:

> Your outline is ready. Sign in to generate your draft and save it securely to your account.

## Implementation requirements

Before releasing this flow, Thido should have:

- a versioned guest-draft data structure so old browser data can be migrated or discarded safely;
- strict size limits for locally stored answers;
- a safe callback URL that returns the user to the same onboarding stage;
- idempotent document creation to prevent duplicate documents after retries;
- explicit clearing rules after conversion, cancellation, and expiry;
- analytics events for guest start, checkpoint reached, login started, login completed, and draft created—without sending document content;
- accessibility and browser tests for refresh, back navigation, OAuth cancellation, failed login, and successful conversion; and
- updated Privacy Policy wording if guest identifiers or content are ever transmitted or persisted before authentication.

## Decision summary

The guest-first experience is worthwhile for Thido if it stops before AI generation and server persistence. It can improve discovery and registration conversion without exposing the product to the full cost and security risks of anonymous document generation.

The recommended boundary is:

**Guest:** enter and temporarily retain initial document information in the browser.

**Authenticated user:** create the database document, call AI providers, save, edit, comment, and access the draft across devices.

## Implementation status

Implemented on 22 July 2026:

- `/` now sends unauthenticated visitors to the public `/documents/new` flow;
- answers are versioned and retained in `sessionStorage` for up to 24 hours;
- sign-in is required before any server write or AI request;
- the callback is preserved through Google sign-in, password registration, email verification, and password sign-in;
- the authenticated claim endpoint validates all answers and creates the document plus its initial prompt answers in one transaction; and
- a unique guest-draft identifier makes retries idempotent and prevents duplicate documents.
