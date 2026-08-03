# Why real-time collaboration needs dedicated infrastructure

**Decision:** Deferred as of 2 August 2026. Thido will use revision-based
stale-write rejection as its current conflict-safety model. Revisit this
architecture only if simultaneous live editing becomes a product requirement.

## Short answer

Thido only needs this infrastructure if it intends to let multiple people type
in the same document at the same time with Google-Docs-style cursors and merged
changes.

The revision protection already implemented in Thido prevents silent data loss:
if two editors start from revision 12 and one saves revision 13, the other
editor's stale save is rejected. That is safe, but the second editor must reload
and reconcile their work. It does not combine both editors' keystrokes.

If simultaneous live editing is not a near-term product requirement, this work
can be deferred. Version history, comments, sharing, Word import/export, PDF
download, and one-editor-at-a-time editing do not require it.

## What is missing from ordinary autosave

The editor currently saves a document snapshot through an HTTP request. A
snapshot represents the entire current document. Consider this sequence:

1. Ada and Ben both open revision 12.
2. Ada edits the introduction while Ben edits the conclusion.
3. Ada saves first and creates revision 13.
4. Ben's request still says it is based on revision 12.
5. Thido rejects Ben's request instead of overwriting Ada's work.

This is correct conflict protection. However, a user expects a live
collaborative editor to retain both changes automatically. That requires the
clients to exchange smaller editing operations and agree on how concurrent
operations are ordered and merged.

## The three separate responsibilities

### 1. A live transport

A persistent bidirectional connection, usually a WebSocket, carries edits and
cursor updates immediately. Repeated HTTP autosaves are too coarse for smooth
presence and per-keystroke synchronization.

### 2. A collaboration protocol

A ProseMirror-compatible collaboration protocol, commonly based on operational
transformation or a CRDT such as Yjs, makes concurrent operations converge on
the same document. It also handles ordering, reconnects, duplicate messages,
and edits made while a client was briefly offline.

A WebSocket alone does not solve merging. It only transports messages.

### 3. Cross-instance coordination and durable recovery

In a scaled deployment, two collaborators may connect to different server
instances. The instances need a shared channel so an operation received by one
instance reaches clients connected to another. They also need enough shared or
durable state for a reconnecting client to recover the current document.

Vercel states that a WebSocket connection remains attached to one Function
instance for its lifetime and that a reconnect or deployment may place the
client on a different instance. Therefore, document rooms, presence, and
cross-instance message distribution must not exist only in an instance's
memory. Vercel recommends an external store such as Redis for that shared
coordination. See [Vercel's WebSocket documentation](https://vercel.com/docs/functions/websockets)
and [real-time application guidance](https://vercel.com/kb/guide/real-time-chat-websockets).

## Why there is a product decision

There are two reasonable implementation paths:

### Managed ProseMirror collaboration service

The provider supplies the collaboration protocol, document rooms, reconnect
behavior, presence, scaling, and often persistence. Thido integrates the editor
and keeps authoritative snapshots or checkpoints in PostgreSQL.

This is the lower-operational-risk option because concurrency and reconnection
behavior are already handled, but it introduces a vendor, recurring cost, and a
data-processing dependency that must be reviewed.

### Vercel WebSockets with shared Redis-backed coordination

Thido owns the WebSocket endpoint and collaboration server. Redis distributes
operations and presence across instances, while PostgreSQL remains the durable
document and version-history store.

This offers more control but requires Thido to implement and operate room
lifecycle, authentication, reconnects, persistence checkpoints, backpressure,
deploy transitions, monitoring, and failure recovery. Redis is coordination
infrastructure, not a substitute for a ProseMirror merge protocol.

Vercel announced native WebSocket support as a public beta in June 2026, so its
current limits and production suitability should be reviewed before choosing
the self-managed route. See the [Vercel WebSocket public-beta announcement](https://vercel.com/changelog/websocket-support-is-now-in-public-beta).

## Recommendation for Thido

Keep the current revision checks regardless of the chosen path; they remain a
useful safety boundary for imports, AI edits, restores, and unexpected client
states.

If live simultaneous editing is required soon, use a managed
ProseMirror-compatible collaboration service first. It gets Thido to a reliable
user experience with less custom distributed-systems work. Reassess a
self-managed Vercel WebSocket and Redis architecture later if scale, cost, or
data-control requirements justify owning it.

If live simultaneous editing is not required soon, leave this item deferred and
describe collaboration accurately: multiple users may access a document, but
stale concurrent saves are rejected rather than merged live.
