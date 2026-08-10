# Database

## Convex is now the application database

The running application stores ERP data in `convex/schema.ts` and implements
its transactional domain operations in `convex/domain.ts`. Numeric ids and the
Spanish response fields are retained so the public API and existing UI keep
their contract. Prices are stored as integer cents internally.

Authentication and ERP data are now managed by Convex: Convex Auth stores the
GitHub identities and sessions, while `convex/schema.ts` stores the business
tables. GitHub is the only application sign-in provider; there are no local
passwords or signup screens to migrate.

The Supabase migration is complete. Its driver script and the Postgres schema
and RLS tooling have been removed; `convex/migration.ts` keeps the import
functions as `internal*` functions for a manual replay from `npx convex run`.

After a user authorizes the configured GitHub OAuth App, Convex authorizes
imported memberships from the verified JWT identity. The rebinding helpers
remain available for imports that need explicit identity rebinding.

## The project boundary

Every row belongs to a project, and access is decided in one place:
`requireProject` in `convex/lib/bridge.ts`. A browser session is resolved from
the Convex Auth JWT and must hold a `projectMembers` row; an API key is pinned
to exactly one project and is refused if it has none. Destructive operations go
through `requireAdmin`, which additionally refuses API keys.

Legacy ids are unique per project. Sequences live in `counters`, keyed by
`project:<legacyId>`, and seed themselves from the highest id already present so
that deployments predating the counters keep working. This replaced reading the
tail of a `by_legacy_id` index, which made every insert in a table conflict with
every other insert in that table across unrelated tenants.

`convex/authorization.test.ts` is the executable statement of these rules.
