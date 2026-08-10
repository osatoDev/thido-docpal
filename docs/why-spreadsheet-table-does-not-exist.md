# Why Prisma says `public.Spreadsheet` does not exist

The application is using a Prisma Client generated from a schema that includes the `Spreadsheet` model, but the connected PostgreSQL database has not received the migration that creates its table.

The repository contains both sides of that mismatch:

- `prisma/schema.prisma` defines `model Spreadsheet`.
- `prisma/migrations/20260809180000_add_spreadsheets/migration.sql` contains `CREATE TABLE "Spreadsheet"`.
- `npx prisma migrate status` reports that `20260809180000_add_spreadsheets` has not been applied to the currently configured `neondb` database.

When code calls a method such as `prisma.spreadsheet.findMany()`, Prisma sends a query for the quoted PostgreSQL table `public."Spreadsheet"`. PostgreSQL cannot find that table and Prisma reports:

> The table `public.Spreadsheet` does not exist in the current database.

This is database schema drift, not a missing TypeScript model and not a Prisma Client generation problem. Running `prisma generate` alone will not create the table.

## Fix

Apply the committed migrations to the same database used by the failing application:

```bash
npm run db:migrate:prod
```

That script runs `prisma migrate deploy`. In this project, `prisma.config.ts` uses `DATABASE_URL_UNPOOLED` as the direct migration connection, while the application normally queries through `DATABASE_URL`. Both variables must point to the same Neon database and branch. If they point to different databases or branches, the migration can succeed in one place while the application continues querying another database without the table.

For a local development database, use:

```bash
npx prisma migrate dev
```

Then verify:

```bash
npx prisma migrate status
```

The output should say that the database schema is up to date. Restart or redeploy the application afterward if it was already running.

Do not use `prisma db push` as the production deployment mechanism here: the repository already has a committed migration, so `prisma migrate deploy` preserves migration history and applies the intended SQL.
