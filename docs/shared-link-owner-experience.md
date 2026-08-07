# Shared-link owner experience

## Recommendation

When the document owner opens their own shared link, Thido should present it as **their public-link preview**.

It should not say **Shared with you**, because nobody shared the document with its owner. It also should not automatically redirect to the private editor: owners need to be able to verify the same document content and permissions that recipients receive.

The ideal owner treatment is:

- Label: **Public link preview** or **Previewing your shared link**
- Attribution: **Shared by you**
- Primary action: **Open original** or **Edit document**
- Secondary action: **Manage sharing**

The document body must remain the public representation. Owner-specific controls are an overlay around that representation, not a different version of the document.

## Viewer-specific presentation

| Viewer | Context label | Attribution | Actions |
| --- | --- | --- | --- |
| Signed-out recipient | Shared document | Shared by `[owner name]` | Actions allowed by the link; request sign-in when required |
| Signed-in recipient or collaborator | Shared with you | Shared by `[owner name]` | Actions allowed by the link and the viewer's access |
| Signed-in owner | Public link preview | Shared by you | Open original, manage sharing, and copy link |

## Why the owner should not be redirected automatically

- The shared URL has a distinct purpose: showing what link recipients can access.
- Owners commonly open their own links to confirm content, presentation, and permissions.
- A silent redirect makes it difficult to test whether sharing is working.
- An explicit **Open original** action keeps the route's meaning clear while making the normal editor one click away.

## Current behavior

The public share page currently does not identify the signed-in viewer. It always uses recipient-oriented language, including **Shared with you** and **Shared by `[owner name]`**, so an owner opening their own link sees misleading copy.

## Acceptance criteria

- The public share page reads the optional authenticated session and compares the viewer's user ID with the document owner ID.
- A signed-in owner sees **Public link preview** (or equivalent), **Shared by you**, and a prominent **Open original** action.
- The owner can reach sharing management directly from the preview.
- The public document title and body render identically for the owner and recipients.
- Signed-out and non-owner behavior remains unchanged, apart from any deliberate collaborator-specific wording.
- Revoked or invalid links continue to return the existing unavailable/not-found state for every viewer, including the owner.
- Owner-only controls are excluded from printed output.
- Authentication-aware page data is not cached in a way that can leak an owner's controls or labels to another viewer.

