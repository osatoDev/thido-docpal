# Founder feedback channel

## Recommendation

Add a signed-in **Want a feature? Suggest it here** messenger, but do not
describe it as a chatbot. It should be a persistent, asynchronous conversation
with the founding team. The interface can feel as immediate as chat while
remaining honest when no founder is online.

Use this promise in the composer:

> We usually reply immediately when we are online. If we are away, expect a
> reply within 8 hours.

Only show an “online” indicator when a founder has deliberately made themselves
available. Never use fake typing indicators, an automated greeting that appears
human, or “live chat” language when nobody is covering the inbox.

## User experience

- Show a persistent **Want a feature? Suggest it here** button on every
  signed-in page. A bottom-left launcher avoids the existing theme control and
  remains available inside the document editor.
- Open a side panel rather than navigating away, so a user can describe a
  problem while looking at the document or screen where it occurred.
- Start with one free-text field and optional categories: **Problem**, **Idea**,
  **Question**, and **Other**. Categories help triage but should never block
  sending.
- Show the existing conversation and its state: sent, replied, or closed. New
  messages should reopen a closed thread automatically.
- Let the user choose whether to include the current page URL and document ID.
  Do not include document text, comments, prompts, or editor selections
  automatically.
- Confirm immediately that the message was saved and show the response
  expectation in the thread.
- Notify the user in Thido and by email when a founder replies. The email should
  link back to the authenticated thread; it should not contain document content.
- Allow screenshots later, after file limits, malware handling, storage,
  retention, and privacy wording are defined. Text feedback is enough for the
  first 100 users.

The launcher label should remain inviting and concrete. **Want a feature?
Suggest it here** makes the product-shaping opportunity obvious, while the
conversation itself still accepts problems, ideas, and questions and makes
clear that the founding team will read and answer.

## Founder workflow

Add a **Feedback** inbox to `/admin` with unread, awaiting-reply, replied, and
closed views. Each thread should show the account name and email, category,
current route, creation time, and response deadline.

When a message arrives:

1. Save it before sending any notification.
2. Set `responseDueAt` to eight hours after the message.
3. Email the founding team immediately with a link to the admin thread.
4. Alert again when two hours remain and mark the thread overdue at eight hours.
5. Clear the deadline only after a founder reply is durably saved.

The eight-hour promise needs operational ownership. At least one person must
receive alerts on mobile, and the team should decide how overnight, weekend, and
holiday coverage works before displaying an unconditional eight-hour promise.
If that coverage is not realistic, promise “within one business day” instead.

## Suggested implementation

For a 100-user beta, build this on the services Thido already uses rather than
adding a customer-support vendor:

- Auth.js identifies the signed-in sender.
- Neon/PostgreSQL stores threads and messages.
- Resend sends new-message and founder-reply notifications.
- `/admin/feedback` is the founder inbox.
- Vercel Cron or a durable workflow sends deadline reminders.
- Rollbar records delivery or processing failures without message content.

Two tables are sufficient initially:

- `FeedbackThread`: user, category, status, current route, optional document ID,
  `responseDueAt`, first response time, created and updated timestamps.
- `FeedbackMessage`: thread, author type (`USER` or `FOUNDER`), author user,
  message body, created timestamp, and read timestamp.

Every read and mutation must verify that the signed-in user owns the thread or
is an allowlisted admin. Rate-limit message creation, cap message length, escape
email output, and avoid logging message bodies.

Real-time sockets are unnecessary for the beta. Poll or refresh the open panel
at a short interval, and send email notifications. This delivers the useful
part of chat without introducing a separate presence and realtime system.

## What not to add yet

- No AI answering as a founder.
- No public or anonymous launcher.
- No automatic access to document contents.
- No attachments until storage and retention are ready.
- No multiple support channels that split conversation history.
- No promise of an immediate answer unless founder availability is explicitly
  active.

This approach gives beta users a direct relationship with the team, creates a
searchable record of product feedback, and keeps the response promise measurable.
