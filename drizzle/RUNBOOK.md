# Drizzle Migration Runbook

## Naming & Conventions

- Name migrations with short, human-friendly slugs (`0007_prompt_templates.sql`), avoiding the random generator when practical.
- Keep one logical change per file (schema change + seed update if tightly coupled).
- All new tables/columns must be mirrored in `src/schema.ts`.

## Creating a Migration

1. Update `src/schema.ts`.
2. Run `pnpm db:generate` to generate SQL + meta snapshots.
3. Inspect the new file in `drizzle/` and commit it alongside the schema change.

## Applying Locally

```bash
pnpm db:migrate
```

## Applying Remotely

```bash
wrangler d1 execute <DB_NAME> --remote --file=drizzle/<file>.sql
```

Keep a log of executed migrations (see `DEPLOY.md`) to avoid double runs.

## Verifying Schema

- Run `pnpm exec tsc` to ensure Drizzle types match.
- Run `pnpm test` to cover critical services after schema changes.

## Rollbacks

- Prefer forward fixes, but if rollback is required, create a compensating migration (e.g., `0008_revert_prompt_templates.sql`) that drops/renames objects safely.

## Seeds

- Seed files live in `/seed`. When schema changes require new seed data, provide matching instructions in `DEPLOY.md`.

Following this runbook keeps schema migrations reproducible and auditable for the team.*** End Patch

