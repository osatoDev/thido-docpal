# Full-access sharing by link

## Current answer

No. Thido does not currently offer a link that gives every signed-in holder
full access.

The current product has two separate sharing models:

| Sharing method | Sign-in required | Permission | Options shown before sign-in |
| --- | --- | --- | --- |
| Public link | No | View only | The document and Print button only |
| Email invitation | Yes | View, comment, edit, or full access | None; access is tied to the invited email address |

Current **Full access** is the closest equivalent to document administration. It
allows a collaborator to edit and delete the document and manage sharing, but it
does not transfer document ownership. It can only be granted to a specific email
address today.

## Requested experience

The requested option is a third sharing model:

> Anyone with the link can see the document interface. They must sign in before
> using document actions. After signing in through that link, they receive full
> access while the link remains active.

Before authentication, the link page should show the document and the relevant
editor controls. When the person selects a protected action, Thido should check
their session at that moment. If necessary, authentication should preserve the
link and selected action as the return destination. Thido should then reopen the
document in the editor with the granted permission, without placing a standing
sign-in instruction beside the controls.

This is not available in the current implementation. Public-link requests go to
a dedicated read-only viewer, while authenticated editor access is authorized
only through ownership or an email-matched collaborator record.

## Recommended product design

Add an **Anyone with the link** permission selector with these choices:

- Restricted;
- Can view;
- Can comment;
- Can edit;
- Full access.

For comment, edit, and full access, require sign-in. A read-only link may remain
available without sign-in if the owner deliberately selects that option.

The pre-login page should:

- identify the access level the link will grant;
- show the document and the actions available at that level;
- check authentication only when a protected action is selected;
- return the user to the same link after authentication; and
- never imply that an action succeeded before authentication.

The signed-in page should display a visible **Full access via link** indicator so
the user understands why the controls are available.

## Security implications

A full-access link is substantially riskier than an email invitation. Anyone who
receives or forwards it could edit the document, invite or remove collaborators,
change the public-sharing state, or permanently delete the document after
signing in.

The owner should therefore see a strong warning before enabling it. Thido should
also provide:

- immediate revocation and token rotation;
- an access log showing which signed-in accounts used the link;
- a confirmation step before deletion or sharing changes;
- optional expiry and a limit on how many accounts may use the link;
- email notification when a new account first uses a full-access link; and
- clear wording that full access does not transfer ownership.

The link token should remain unguessable and must not be written to analytics,
error reports, referrer logs, or email previews beyond the intended invitation.
Authorization must be enforced on every server operation; displaying or hiding
controls is not an access boundary.

## Recommended implementation semantics

The link should grant access dynamically after authentication rather than
silently creating a permanent email collaborator. This preserves the meaning of
link revocation: once the owner disables or rotates the link, link-derived
permissions stop immediately.

Thido should store the link's permission, active state, optional expiry, and a
hash or equivalent protected representation of its token. Requests to the
editor and every document API should accept link-derived permission only when:

1. the user is authenticated;
2. the link is active and unexpired;
3. the token belongs to the requested document; and
4. the requested operation is allowed by the link's current permission.

Direct email collaborators should continue to work independently. Revoking a
link must not remove access that a person also holds through an explicit email
invitation.

## Acceptance criteria

- An owner can select **Anyone with the link → Full access** and receives a
  warning describing edit, delete, and sharing-management authority.
- Opening the link while signed out shows the document and its full-access
  controls without a standing authentication prompt.
- Selecting a protected control checks the session and, when necessary,
  preserves that action through authentication.
- Sign-in returns to the same document instead of the dashboard.
- A signed-in link holder can use the enabled editor and sharing controls.
- A signed-out user and a signed-in user without the link cannot call protected
  document APIs successfully.
- Revoking or rotating the link immediately removes link-derived access from
  subsequent requests.
- Existing direct collaborator permissions continue to apply after link
  revocation.
- The owner can see which accounts used the link and when.
- Public links remain excluded from search-engine indexing.
- Terms and privacy disclosures are updated before release because the current
  language describes public links as read-only.

## Recommendation

The feature is technically compatible with Thido's existing permission levels,
but it should be treated as a new authorization model rather than an extension
of the current public viewer. Implement view, comment, and edit link permissions
first. Add full-access links only with revocation, access logging, explicit risk
warnings, and server-side authorization tests in place.
