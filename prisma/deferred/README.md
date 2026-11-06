# Deferred migrations

Migrations here are intentionally kept out of `prisma/migrations` so
`prisma migrate deploy` does not apply them.

`20261107120000_thido_2_remove_document_features` drops the comment,
suggestion, spreadsheet, sharing, wizard and history-retention tables and
columns. The legacy Thido deployment still reads them, so it waits until the
legacy site is retired. To apply it then: back up the database, move the
folder back into `prisma/migrations` (renaming it to a current timestamp so it
sorts after any newer migrations), and run `npm run db:migrate:prod`.

The current app runs against the old schema in the meantime: Prisma ignores
tables and columns the schema no longer lists, and every dropped column is
nullable or has a default. Note that `prisma migrate dev` will notice the
difference and offer to generate the same drops; decline until the legacy
site is gone.
