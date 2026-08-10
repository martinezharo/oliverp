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
