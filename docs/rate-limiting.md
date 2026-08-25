# Rate limiting in Thido

## What Thido uses it for

Thido uses rate limiting for two practical reasons:

1. **Protect authentication from automated abuse.** It limits repeated password guesses, mass account creation, and repeated password-reset or verification-email requests.
2. **Control expensive AI usage.** It limits how frequently a user can trigger document generation, follow-up question generation, and other paid AI operations.

It does not limit ordinary writing, editing, reading documents, changing settings, or navigating the application.

### Authentication protection

On the login form, the limiter slows password guessing. Thido checks both the request's IP address and the combination of IP address plus email. The broad IP limit catches one source trying many accounts, while the combined limit catches repeated attempts against one account.

Registration is limited to reduce automated creation of large numbers of accounts.

Password-reset and verification-email requests are limited because every successful request can create a database token and send a paid transactional email. The limit reduces email spam, protects Resend usage, and prevents someone from repeatedly filling another person's inbox with Thido messages.

### AI cost protection

Thido's AI routes call Anthropic. Those calls take more processing time and directly consume a paid API allowance. The limiter prevents a user, script, accidental double submission, or broken client from triggering an unlimited number of AI requests in a short period.

The current AI allowance is shared per authenticated user across the protected AI operations. This is a short-term burst limit, not a subscription or monthly usage quota.

### Current scope

| Thido operation | Reason for limiting it |
|---|---|
| Password login | Slow automated password guessing |
| Account registration | Reduce automated or accidental account creation |
| Password-reset email | Prevent inbox spam and excessive email delivery |
| Verification email | Prevent inbox spam and excessive email delivery |
| Reset-password submission | Slow repeated attempts using invalid or stolen links |
| AI follow-up generation | Protect paid Anthropic usage and server capacity |
| Document generation | Protect paid Anthropic usage and server capacity |
| Batched comment revisions | Protect paid Anthropic usage and server capacity |

The current limiter is deliberately a first layer. Because it is stored in application memory, it is not a strict global limit across every Vercel instance. A shared Redis-backed limiter is the appropriate production upgrade when traffic or abuse risk grows.

## What the limiter does

Thido currently uses a small in-memory sliding-window limiter in `src/lib/rateLimit.ts`. It keeps a map whose keys identify a category of request and whose values are timestamps for recent requests.

For each request, `checkRateLimit(key, limit, windowMs)`:

1. Reads the timestamps previously recorded for the key.
2. Removes timestamps older than the configured window.
3. Rejects the request when the number of remaining timestamps is already at the limit.
4. Otherwise records the current timestamp and permits the request.

For a limit of five requests per hour, the first five calls return `true`. Further calls made before enough timestamps become older than one hour return `false`.

## Keys used by authentication

Authentication uses a combination of IP-address and email-aware keys:

| Operation | Key | Current limit |
|---|---|---:|
| Password login, broad IP limit | `password-login:<address>` | 20 per 15 minutes |
| Password login, IP and email | `password-login:<address>:<email>` | 8 per 15 minutes |
| Registration | `password-signup:<address>` | 5 per hour |
| Request password reset | `password-reset:<address>` | 5 per hour |
| Submit password reset | `password-reset-submit:<address>` | 10 per hour |
| Resend verification email | `verification-email:<address>` | 5 per hour |

The login flow uses two limits. The broad address limit slows an IP that tries many accounts, while the address-and-email limit slows repeated guesses against one account. Error messages remain generic so the limiter does not reveal whether an account exists.

The request address is read from `x-real-ip`, then the first value of `x-forwarded-for`, and finally falls back to `unknown`. On Vercel these headers are supplied by the platform. They must only be trusted when the application is behind a trusted proxy that overwrites client-provided forwarding headers.

## Important limitation

The map lives in one Node.js process. Vercel may run several function instances, and every instance has a separate map. A new deployment or a recycled function also starts with an empty map. The current limiter is therefore useful for development and basic abuse reduction, but it is not a strict global security boundary.

## Production practice

For stronger protection, replace the map with a shared atomic store such as Upstash Redis. A production implementation should:

- use an atomic sliding-window or token-bucket operation;
- set automatic expirations on limiter keys;
- share counters across regions and function instances;
- retain both broad IP and IP-plus-account limits;
- add monitoring for sustained rejections;
- consider Vercel Firewall rate-limit rules as an outer layer;
- avoid permanently blocking an account based only on an attacker-controlled email value.

Rate limiting is one layer. Password hashing, generic responses, single-use tokens, token expiry, and email ownership checks remain necessary even with a shared limiter.

## Tests

`src/lib/rateLimit.test.ts` verifies that requests are allowed up to the configured limit, that the following request is rejected, and that counters remain isolated between keys.
