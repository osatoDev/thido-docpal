# Document-import validation logging

## What changed

Document imports now produce safe, structured runtime logs for both expected validation outcomes and unexpected failures. Every response includes a request reference in the `x-thido-request-id` header; import error responses also include it in their JSON body, and the editor displays it beside the error. This lets support match a visible File-picker error to its server log.

Expected validation failures remain warning-level operational events rather than Rollbar exceptions. Unexpected failures are error-level runtime events and continue to be reported to Rollbar.

## Logged fields

An import outcome records:

- event name and severity;
- request reference;
- file kind (`markdown`, `docx`, or `unknown`);
- HTTP status and a stable outcome reason;
- elapsed time;
- document ID after the route resolves it.

Stable reasons cover authentication, rate limiting, access, file and revision validation, locks, revision conflicts, successful imports, conversion failures, persistence failures, comment-reconciliation failures, and cleanup failures.

## Privacy boundary

Runtime logs do not include filenames, file contents, document text, raw form data, or exception messages. Unexpected events include only a validated error class name; Rollbar remains the restricted diagnostic channel for the full exception.

## Verification

The focused unit tests verify safe request-reference handling, privacy-preserving exception metadata, bounded structured fields, and warning-level JSON output.

A browser check imported an intentionally oversized Markdown fixture. The editor displayed the same request reference as the structured `413` runtime log, whose stable reason was `file_too_large_or_empty`; neither output exposed the fixture filename or contents.
