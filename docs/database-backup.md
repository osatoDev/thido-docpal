# Backing up the Thido database

Thido's database is a Neon Postgres database (server version 17) connected to the Vercel project `thido-docpal`. Vercel does not back it up itself. Backups happen in Neon. There are two ways to take one: a Neon branch, which is quick, or a `pg_dump` file, which you keep yourself. Before the Thido 2.0 migration, do the first. Do both if you want a copy outside Neon.

## Option 1: Neon branch (recommended, about a minute)

A branch is an instant copy of the database at a point in time. It costs almost nothing until data diverges, and you can restore from it or query it later.

1. In Vercel, open the `thido-docpal` project, go to **Storage**, select the database, and choose **Open in Neon**.
2. In the Neon console, go to **Branches** and choose **Create branch**.
3. Set the parent to the production branch (usually `main`), choose **Current point in time**, and name it something like `before-thido-2-migration`.
4. Create it. Don't connect it to the Vercel project.

To roll back after a bad migration, use Neon's **Restore** on the production branch, choosing either that branch or a timestamp just before the migration. Neon also keeps a rolling restore history. How far back it goes depends on your Neon plan, so check **Settings → Storage** (history retention) in the Neon project before relying on it.

When you no longer need the branch, delete it. It holds a full copy of user data.

## Option 2: `pg_dump` file (a copy you hold)

1. **Get a version 17 `pg_dump`.** The newest one on this Mac is 16.2 (Postgres.app), and it refuses to dump a newer server. Either:
   - run `brew install postgresql@17` and use `$(brew --prefix postgresql@17)/bin/pg_dump`, or
   - add PostgreSQL 17 in Postgres.app and use `/Applications/Postgres.app/Contents/Versions/17/bin/pg_dump`.
2. **Get the direct (unpooled) connection string.** In Vercel go to **Storage → database → .env.local** tab, or use the Neon console's **Connect** button with pooling turned off, and copy `DATABASE_URL_UNPOOLED`. Don't use the pooled `-pooler` host for dumps.
3. **Dump it** to a folder outside the repo:

   ```sh
   pg_dump "<unpooled connection string>" --format=custom --no-owner --no-acl \
     --file ~/thido-backups/thido-$(date +%Y%m%d-%H%M).dump
   ```

4. **Check the file** by listing its contents:

   ```sh
   pg_restore --list ~/thido-backups/thido-*.dump | head
   ```

To restore into an empty database, such as a new Neon branch:

```sh
pg_restore --no-owner --no-acl --dbname "<target connection string>" ~/thido-backups/<file>.dump
```

The dump contains every user's documents, account details and email addresses. Keep it out of the repository and off shared drives, and delete it once it's no longer needed.

## For the Thido 2.0 deploy

1. Create the Neon branch `before-thido-2-migration` (Option 1).
2. Deploy the new code.
3. Run `npm run db:migrate:prod` against production.
4. Check the site. If something's wrong, restore from the branch.
