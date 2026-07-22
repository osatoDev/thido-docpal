<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:user-explanation-delivery -->
# Explanation delivery

When the user asks to explain something, write the explanation to an appropriately named Markdown file under `docs/` instead of placing the explanation in the chat response. In chat, provide only a concise completion note and a link to the Markdown file.
<!-- END:user-explanation-delivery -->

<!-- BEGIN:production-todo -->
# Production readiness tracking

Maintain `docs/production-todo.md` as the running source of truth for work needed to productionize Thido. Whenever a task creates, completes, changes, or reveals a production requirement, update that checklist in the same turn. Only mark an item complete when there is evidence in the repository or verified external configuration; do not infer completion.
<!-- END:production-todo -->
