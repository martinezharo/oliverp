# Engineering Audit

Last updated: 2026-08-10

This file records findings that should not be changed without an explicit product,
data-model, deployment, or accounting decision. Straightforward defects found in
the same audit are fixed in code and covered by tests rather than duplicated here.

## 1. Framework migration and deployment upgrade — resolved

**Priority:** Resolved

The application has been migrated from Astro to Next.js 16 with the App Router,
React 19, Convex Auth, and OpenNext on a single Cloudflare Worker. The old Pages,
Astro, Better Auth, and OAuth-proxy runtime layers were removed rather than kept
as parallel paths.

The migration was verified with TypeScript, ESLint, unit tests, Convex tests,
Playwright E2E tests, Next production builds, an OpenNext build, and a real local
Worker preview. The remaining findings below are backend and accounting design
decisions, independent of the framework migration.

The follow-up regression sweep found and fixed the React 19 stock-adjustment
failure caused by reading `event.currentTarget` after an `await`, restored the
sale/purchase/other edit flow, made purchase stock movements depend on the
`recibida` status, and hardened the legacy transaction delete/update paths. The
browser now covers the operation dialogs and the stock history flow in E2E tests;
demo writes remain intentionally read-only, so the stock save test isolates only
the demo response while exercising the real form and refresh behavior.

## 2. Convex list and reporting queries are not scalable

**Priority:** High as data grows

Several paths in `convex/domain.ts` call `.collect()` for every sale, purchase,
line, movement, or product in a project and then filter, count, sort, join, and
paginate in memory. `stockRowsForProject` additionally filters the complete line
and movement arrays once per product, producing quadratic work. The API appears
paginated, but the backend work is still unbounded and will eventually hit Convex
transaction read limits.

Examples include `listProducts`, `listSales`, `listPurchases`,
`transactionSources`, `computeDailyFinances`, and `stockRowsForProject`.

**Decision required:** choose the reporting model. Options include native cursor
pagination for transactional lists plus Convex aggregate components and
transactionally maintained per-product/per-day summaries for stock and finance.
This changes query contracts and write paths, so it should be designed and
migrated deliberately.

## 3. Time-dependent inventory metrics are computed inside cached queries

**Priority:** Medium

`stockRowsForProject` uses `Date.now()` to define 30-day and 60-day windows.
Convex queries are reactive to database changes, not the passage of wall-clock
time, so an unchanged project can keep stale sales velocity, cost, and remaining
stock-day values. Reading the wall clock also reduces query-cache reuse.

**Decision required:** either pass a caller-controlled `asOf` date and define a
refresh cadence, or materialize daily metrics with a scheduled mutation. The
choice affects API reproducibility and operational scheduling.

## 4. Historical profit uses the latest purchase cost, not cost at sale time

**Priority:** Medium / accounting correctness

`computeDailyFinances` finds one latest purchase cost per product across the full
dataset and applies it to every historical sale. Adding a new purchase can
therefore rewrite prior-day profit without changing those sales. This may be
intentional replacement-cost reporting, but it is not stable historical margin.

**Decision required:** define the accounting rule: replacement cost, weighted
average, FIFO, or cost captured on each sale line. Once selected, add fixtures
that demonstrate how later purchases must affect earlier profit reports.

## 5. Backend authorization depends on one shared bridge secret

**Priority:** Medium

Convex Auth issues the browser session and Convex verifies it with
`ctx.auth.getUserIdentity()` before resolving project memberships. The bridge
secret remains only as a server-to-server Worker/API gateway guard.

It is, however, still one static credential that authorises the entire domain
surface for every tenant. `convex/migration.ts` — which can rewrite any row and
reassign project membership — was moved to `internal*` functions so it is no
longer reachable with the secret alone, but `convex/domain.ts` still is.

**Decision required:** whether to keep a shared secret at all now that every
mutation also proves a per-user or per-key identity, or to replace it with a
signed, short-lived gateway token. Rotate the secret before opening sign-up
either way.

## 6. Opening sign-up: what changed — resolved

**Priority:** Resolved

The deployment stopped being single-tenant, which changed the meaning of
several defaults that had been correct while "every project" and "my projects"
were the same set:

- **API keys are pinned.** An unbound key used to fall through to unrestricted
  access in `requireProject`, and `listProjects`/`visibleProjects` returned every
  project in the deployment. `projectLegacyId` is now required on `apiKeys` and
  an unbound key is refused.
- **`requireAdmin` no longer exempts API keys.** It previously returned early
  for them, so the role check applied to nobody. Administrative operations are
  now restricted to a signed-in admin member.
- **Legacy ids are per project.** `nextLegacyId` read the tail of a
  `by_legacy_id` index, which put every insert in a table into one read set:
  unrelated tenants conflicted on every write. Ids now come from `counters`
  rows scoped to a project, and every lookup by legacy id is project-scoped.
- **Writes are budgeted.** `consumeWriteBudget` applies a fixed-window per-actor
  limit, which bounds the damage a single account can do through the unbounded
  reads described in finding 2.
- **Demo mode is only ever a choice.** It used to switch on whenever Convex was
  unconfigured, so a misconfigured production deployment served a convincing
  mock instead of failing.
- **OAuth redirect origins are opt-in.** Development hosts were allowlisted
  unconditionally; the redirect carries the authorization code, so they are now
  gated behind `ALLOW_LOCAL_AUTH_ORIGINS`.

`convex/authorization.test.ts` covers each of these. The Postgres RLS suite that
used to assert tenant isolation was testing a backend the application no longer
uses and has been removed with the rest of the Supabase tooling.

## 7. There is still no membership UI

**Priority:** Medium

`projectMembers` supports an `admin`/`miembro` role and `requireAdmin` enforces
it, but nothing writes a membership except project creation. Every project
therefore has exactly one member, and the role distinction is not yet
observable. Inviting, listing and removing members needs a screen, and removing
the last admin of a project needs a rule.

Users can delete their own projects and their whole account from `/ajustes`.
Both purge in budgeted rounds and report progress, because a large project can
exceed the write limit of a single Convex transaction.
