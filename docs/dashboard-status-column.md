# Dashboard status column

The dedicated `Status` column was removed from the default dashboard table.

Why:

- `READY` is the steady-state for most documents, so a full column mostly repeated low-signal information.
- The two states that do matter operationally are `DRAFTING` and `GENERATING`, because they explain why a document opens into the wizard flow instead of the editor.
- Keeping those non-ready states next to the title preserves the useful signal without spending a full desktop column on it.

Current recommendation:

- Keep the dashboard sortable by `Title` and `Last accessed`.
- Show a compact inline badge only when a document is not `READY`.
- Treat `READY` as the default state and avoid surfacing it unless a workflow specifically depends on it.
