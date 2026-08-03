# Follow-up messages in AI comments

Thido now lets a user continue an open AI comment thread after the first AI
response. The comment card displays an **Add another message** composer when the
thread contains a Thido response and the current user has comment permission.

Each submitted message is stored as a user reply in the existing comment thread.
Thido receives the current document text, the original comment target, and the
ordered conversation before writing its next reply. Follow-up replies are
conversational: they do not claim to have changed the document and do not create
or apply a new edit suggestion.

The existing permission and concurrency rules still apply:

- view-only users cannot add messages;
- resolved threads must be reopened before the conversation continues;
- active whole-document AI work blocks competing follow-ups;
- whole-document follow-ups retain the document-wide AI lock while processing;
- AI usage uses the account's selected model, rate limit, and telemetry; and
- if the AI response fails, the user's message remains saved and the thread
  reports the failure.

Before production deployment, browser verification should cover a selection
comment and a whole-document comment, repeated follow-ups, a resolved thread, a
view-only collaborator, an AI failure, and a competing whole-document action.
