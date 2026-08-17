# OlivERP

OlivERP is an open-source ERP for small businesses and independent sellers.
Record sales, purchases, and other income or expenses; keep inventory, VAT,
and financial summaries together; and connect automations through the API.

[Open the hosted app](https://oliverp.4oli.com) · [API contract](https://oliverp.4oli.com/api/v1/openapi.json) · [Source code](https://github.com/martinezharo/oliverp)

> OlivERP is under active development. Interfaces, the data model, and the API
> may change.

## What it includes

- Sales and purchases with multiple product lines, VAT, and automatic stock movements.
- Product catalog, inventory valuation, stock history, and manual adjustments.
- Other income and expenses, daily views, and financial summaries.
- Project-scoped data and API keys, with GitHub OAuth authentication.
- English and Spanish interfaces, plus an installable progressive web app.
- Read-only demo mode with sample business data.
- A documented API for scripts, n8n, Make, AI agents, and other integrations.
- Private, declarative GitHub plugins that apply reviewed rules to one project.

The application is available at `/`, while the authenticated ERP lives under
`/app`. Spanish routes use the `/es` prefix. The API is available under
`/api/v1`.

## Stack

| Area | Technology |
| --- | --- |
| Web app | Next.js App Router, React, and Tailwind CSS |
| Data and auth | Convex and Convex Auth |
| Sign-in | GitHub OAuth |
| Runtime and hosting | OpenNext on a Cloudflare Worker |
| Verification | TypeScript, ESLint, Vitest, Convex tests, and Playwright |

## Local development

### Requirements

- Node.js 22+
- pnpm 11+
- Access to an isolated Convex development deployment
- A GitHub OAuth App configured for that Convex deployment

### Setup

```bash
pnpm install
cp .env.example .env.local
pnpm exec convex deployment select dev
pnpm run check:dev-env
```

Configure the selected development deployment before signing in:

- Set `CONVEX_BRIDGE_SECRET` to the same random value in `.env.local` and in
  Convex. Use a different value in production.
- Set `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and `SITE_URL` in Convex. GitHub
  credentials belong in Convex, not in `.env.local` or a `NEXT_PUBLIC_` variable.
- Add `GITHUB_PLUGINS_APP_ID` and `GITHUB_PLUGINS_PRIVATE_KEY` only when local
  plugin installation is needed.

Run the backend and the web app in separate terminals:

```bash
pnpm dev:backend
```

```bash
pnpm dev
```

Both development commands verify that the browser URL and Convex deployment
match and refuse to run against a `prod:*` deployment.

## Useful commands

| Command | Purpose |
| --- | --- |
| `pnpm run check` | Type-check the application, Convex functions, and tests |
| `pnpm run lint` | Run ESLint |
| `pnpm run test` | Run unit and integration-style tests |
| `pnpm run test:convex` | Run Convex function tests |
| `pnpm run test:e2e` | Run the Playwright browser suite |
| `pnpm run build` | Build the Next.js application |
| `pnpm run preview` | Build and preview the Cloudflare Worker locally |
| `pnpm run docs:generate` | Regenerate the in-app Markdown documentation |

Before submitting a change, run at least:

```bash
pnpm run check
pnpm run lint
pnpm run test
pnpm run test:convex
pnpm run build
```

## Deployment

The production configuration targets the `oliverp` Cloudflare Worker at
`https://oliverp.4oli.com`. After configuring Cloudflare and the production
Convex environment, use:

```bash
pnpm run deploy
```

This deploys the Convex functions and then the OpenNext Worker. The Worker
configuration, public Convex URL, assets, and custom domain are defined in
[`wrangler.jsonc`](https://github.com/martinezharo/oliverp/blob/main/wrangler.jsonc).

## API

The machine-facing contract is always available at:

```text
https://oliverp.4oli.com/api/v1/openapi.json
```

API keys are created and revoked from **Settings → project → Manage API keys**.
Each key is bound to one project and can be read-only or read/write. The full
authentication model, endpoints, idempotent writes, and request examples are
documented in [`docs/API.md`](https://github.com/martinezharo/oliverp/blob/main/docs/API.md).

## Documentation

The app exposes a focused set of user-facing documents at
`/app/documentacion`: the usage guide, API reference, and plugin documentation.
Repository-only engineering material remains available here:

- [App usage guide](https://github.com/martinezharo/oliverp/blob/main/docs/APP_GUIDE.md)
- [API reference](https://github.com/martinezharo/oliverp/blob/main/docs/API.md)
- [Private plugins](https://github.com/martinezharo/oliverp/blob/main/docs/PLUGINS.md)
- [Database and authorization model](https://github.com/martinezharo/oliverp/blob/main/docs/DATABASE.md) — repository only
- [Engineering audit and open decisions](https://github.com/martinezharo/oliverp/blob/main/docs/AUDIT.md) — repository only
- [Contributing](https://github.com/martinezharo/oliverp/blob/main/CONTRIBUTING.md) — repository only

## License

OlivERP is distributed under the [MIT License](https://github.com/martinezharo/oliverp/blob/main/LICENSE).
