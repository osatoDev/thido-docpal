# Comment scope policy

Yes, that is the right default.

Each comment should stay selection-scoped by default, and only expand beyond the selected text when the user's request clearly implies a broader rewrite.

## Recommended behavior

1. Treat the highlighted selection as the primary target of the comment.
2. Allow the model to read bounded surrounding context so it can interpret tone, references, and paragraph flow.
3. Keep the replacement constrained to the selected anchor unless the request explicitly calls for a larger unit such as:
   - "rewrite this paragraph"
   - "make this whole section stronger"
   - "rework the introduction"
4. If the user asks for a broader change than the selected span can safely support, the system should escalate deliberately rather than silently widening the edit.

## Why

This gives the safest editing model:

- The user stays in control of what is being changed.
- AI edits remain predictable and reviewable.
- The system still has enough nearby context to avoid awkward local rewrites.
- Broader edits become an explicit product decision, not an accidental side effect of an anchored comment.

## Important distinction

There are really two different scopes here:

- `interpretation scope`: how much surrounding context the model is allowed to read
- `edit scope`: how much text the model is allowed to change

The correct policy is:

- interpretation scope can be larger than the selection
- edit scope should remain the selection by default

That is also consistent with the existing open production requirement in [docs/production-todo.md](/Users/osatohanmwenguobadia/Documents/GitHub/thido-docpal/docs/production-todo.md), which says comment-driven revisions should use bounded surrounding context while keeping replacements constrained to the selected anchor.

## When to allow a larger span

A larger span should be explicit, not inferred loosely. Good triggers are:

- the comment names a broader unit like paragraph, section, intro, or conclusion
- the selected text is obviously incomplete for the requested rewrite
- the requested improvement depends on restructuring multiple adjacent sentences

Even then, the UI should make that scope visible, for example by showing `Apply to paragraph` or `Apply to section`, rather than silently expanding from a sentence to a larger block.
