# Migrations

Schema changes and migration safety.

## Rules

- Never modify a migration that has already run; create a new one.
- Make migrations reversible whenever possible (`reversible` blocks with explicit up/down SQL for data moves).
- Data moves inside migrations: raw SQL when the migration must stay valid as models drift (long-lived, rerun across environments, or feeding a constraint); referencing app models is fine in a short-lived data-only migration soon superseded by schema load.
- Avoid long table locks on large tables; split risky work into multiple deploy-safe steps.
- Separate schema changes from heavy data backfills.
- Prefer database operations that remain safe when rerun (`table_exists?` / `column_exists?` guards where migrations may run against varied states).
- Small inline backfills are fine in one migration (add column → `execute "UPDATE ..."` → tighten constraint); anything long-running moves out of the migration path entirely.
- Migrations are transient: interacting with models present at the time is fine; running full `db:migrate` from zero is the antipattern (use schema load).

## Script Backfills (not everything is db:migrate)

Long-running or risky data backfills live in `script/migrations/*.rb`, run manually (e.g. via Kamal), not in the deploy migration window:

- Document preconditions and run instructions in the header comment.
- Preflight queries print scope before mutating.
- Idempotent: skip rows already processed (`next if Entry.exists?(...)`) so reruns are safe.
- Batched (`find_each` / `in_batches`), never one giant write.

## Safe Patterns

- Add nullable column -> backfill -> enforce `NOT NULL`.
- Add index concurrently when supported/needed.
- Dedupe data (raw SQL delete of older duplicates) in the same migration immediately before adding a unique index.
- Short-lived data-only migrations are legitimate: `find_each` + `update!` up, `update_all` down.
- Batched backfills instead of one giant write.

## Constraints: a deliberate choice, not a default

- Prefer DB-level uniqueness indexes over AR `validates uniqueness` (the validation races; the index doesn't).
- Foreign keys are a tradeoff: Fizzy deliberately removed all FKs (`foreign_key: false` on references) for DDL speed and shard-friendliness, keeping integrity in Rails. Either posture is fine, but make it consistent and documented, not accidental.
- Enforce odd invariants with cheap schema tricks where CHECK constraints are awkward: e.g. singleton tables via a `singleton_guard` column defaulting to 0 with a unique index.
- Atomic per-tenant counters: `account.increment!(:cards_count)` for sequence numbers + unique `[account_id, number]` index; a locked sequence row (`first_or_create!` under lock, `increment!`) for global ID sequences.

## Multi-Tenant Index Strategy

- When tenanting an app, replace global indexes with `[account_id, ...]` composites in a dedicated migration phase; drop now-redundant single-column indexes and comment why.
- Scoped uniqueness lives at the DB level: `add_index :tags, [:account_id, :title], unique: true`.

## Multi-Database / Multi-Adapter Apps

- Solid Queue/Cache/Cable each get their own database with separate `migrations_paths` and schema files.
- Supporting SQLite + MySQL from one codebase: early-return adapter guards in migrations (`return if connection.adapter_name == "SQLite"`), adapter-specific DDL (FTS5 vs sharded fulltext), and dual schema dumps (`schema.rb` / `schema_sqlite.rb` via per-config `schema_dump`).
- SQLite in production: set `default_transaction_mode: immediate` to reduce `SQLITE_BUSY` under concurrent writers.
- Disable `dump_schema_after_migration` in production.

## Staged Rollout Playbooks

- **Column replacement**
  - Deploy 1: add new nullable column.
  - Deploy 2: dual-write / backfill.
  - Deploy 3: read from new column.
  - Deploy 4: enforce constraints, then drop old column later.

- **Constraint hardening**
  - Add data cleanup/backfill first.
  - Add index/constraint only after data is compliant.
  - Flip application behavior to rely on constraint once live.

- **Destructive changes**
  - First deprecate reads/writes in app code.
  - Remove usage in a separate deploy.
  - Drop columns/tables only after confirmation window.

## Red Flags

- Irreversible migrations without explicit reason.
- Combining schema rewrite + heavy data migration in one step.
- Large backfills inside transaction-heavy default migrations (move to `script/migrations/`).
- Dropping columns/tables without staged deprecation.
- Referencing app models in a migration expected to still run after those models change (use raw SQL or an inline minimal AR class there).
- Adding a unique index without first deduping existing data.
- `validates uniqueness` with no backing unique index.
