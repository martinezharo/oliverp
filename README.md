# OlivERP 🚀

OlivERP is a small ERP for personal projects, freelancers, and small
businesses. It supports multiple projects, inventory, sales, purchases,
financial dashboards, and a machine-facing API backed by Convex.

Production URL: configure after the first Worker deployment · [API documentation](./docs/API.md)

## Stack

- [Next.js](https://nextjs.org/) with the App Router
- [Convex](https://convex.dev/) for data and [Convex Auth](https://auth.convex.dev/)
- GitHub OAuth as the only sign-in provider
- [OpenNext](https://opennext.js.org/) on one Cloudflare Worker
- Tailwind CSS 4

The old Astro, Pages, Better Auth, and OAuth-proxy layers are no longer part of
the application.

## Routes

`/` is the public landing page. The ERP itself lives under `/app`
(`/app/stock`, `/app/transacciones`, …) and needs a session; anonymous visitors
are redirected to `/login` by the middleware. The route table backing the
sidebar, the header title and every internal link is
[`src/lib/navigation.ts`](./src/lib/navigation.ts).

## Demo mode

The demo is an explicit, read-only path, offered from both the landing page and
the login screen. It has mock projects, stock, and financial data, does not
require an account, and leaving it returns to the landing page.

## Local development

Prerequisites: Node.js LTS, pnpm, and access to the OlivERP Convex project.

```bash
pnpm install
pnpm exec convex deployment select dev
pnpm run check:dev-env
pnpm dev:backend
```

In a second terminal:

```bash
pnpm dev
```

The selected `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` must describe the
same personal dev deployment. Both `pnpm dev` and `pnpm dev:backend` run a
safety check that rejects `prod:` deployments and mismatched browser URLs.
The check also prints the configured `DEV_PUBLIC_URL` so the HTTPS address is
visible whenever either command starts. Production remains pinned independently
in `wrangler.jsonc`.

`pnpm dev:backend` watches `convex/` and pushes functions to the dev deployment.
`CONVEX_BRIDGE_SECRET` is server-only and must use the same value in
`.env.local` and the dev Convex environment. Use a different value in
production.

### Separate GitHub OAuth Apps for development and production

Convex Auth owns the OAuth flow and keeps each GitHub client secret in its
Convex deployment. Development and production use separate databases and
separate GitHub OAuth Apps because their callback hosts differ:

| Environment | Convex deployment | GitHub callback URL |
| --- | --- | --- |
| Development | `dev:<deployment-name>` | `https://<deployment-name>.convex.site/api/auth/callback/github` |
| Production | `prod:reminiscent-cricket-450` | `https://reminiscent-cricket-450.convex.site/api/auth/callback/github` |

Create an OAuth App named `OlivERP Development` with the development callback,
then store its credentials in the dev deployment (the commands prompt for the
values so they do not enter shell history):

```bash
pnpm exec convex env set AUTH_GITHUB_ID --deployment dev
pnpm exec convex env set AUTH_GITHUB_SECRET --deployment dev
```

Set the dev deployment's `SITE_URL` to the frontend origin you actually use and
enable only the additional localhost or tailnet origins required for
development. Production allows only `https://oliverp.4oli.com`; never enable
local auth origins there.

The one-time `pnpm exec auth` setup generates the internal `JWT_PRIVATE_KEY`
and `JWKS` values required to sign Convex Auth sessions. Each deployment keeps
its own pair in Convex; they are not application or GitHub keys. The current dev
and production deployments already have these values.

Production credentials remain in the production Convex environment. To
reconfigure them deliberately, target production explicitly:

```bash
pnpm exec convex env set AUTH_GITHUB_ID --prod
pnpm exec convex env set AUTH_GITHUB_SECRET --prod
pnpm exec convex env set SITE_URL https://oliverp.4oli.com --prod
```

Never put either GitHub secret in `.env.local`, Cloudflare variables, or a
`NEXT_PUBLIC_` variable. The callback is on Convex, not on the Next app.

## Cloudflare Worker deployment

The repository is configured for the `oliverp` OpenNext Worker at
`https://oliverp.4oli.com`, not Pages:

```bash
pnpm preview
pnpm deploy
```

`pnpm run build:worker` produces the `.open-next` output expected by
`wrangler deploy`. Cloudflare Git builds inject `WORKERS_CI=1`, so their
existing `pnpm build` command automatically adds that OpenNext output after
the underlying Next.js build. Local `pnpm build` remains a plain Next.js build.

Configure these Worker bindings:

| Name | Type | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | variable | Public Convex cloud URL used by the browser; set in `wrangler.jsonc` |
| `CONVEX_BRIDGE_SECRET` | secret | Server-only bridge credential, matching Convex |

Convex environment variables:

| Name | Purpose |
| --- | --- |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth App credentials |
| `SITE_URL` | Canonical post-login origin |
| `CONVEX_BRIDGE_SECRET` | Must match the Worker secret |
| `ALLOW_LOCAL_AUTH_ORIGINS` | Development deployments only; allows localhost redirects |

`AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` belong only to Convex. Convex
automatically provides `CONVEX_SITE_URL` to its functions for the auth issuer.

The generated Worker entrypoint is `.open-next/worker.js`; `wrangler.jsonc`
defines the Worker, assets, self-reference service, and `nodejs_compat`.

## Existing data

The Convex backend keeps the legacy numeric ids used by the UI and API, but
they are unique **per project**, not globally: `/api/v1/ventas/{id}` and its
siblings resolve the id inside the project of the calling API key. Sequences
are stored in the `counters` table and initialise themselves from the highest
existing id the first time a project writes, so an existing deployment needs no
migration step.

The data import is finished and its driver script has been removed together
with the legacy database tooling. The import functions themselves remain in
`convex/migration.ts` as `internal*` functions, runnable only from a trusted
shell with `pnpm exec convex run`.

### Before opening sign-up

- Every API key must be pinned to a project. `pnpm api:key` now requires
  `--proyecto`, and the schema rejects a key without one. Delete or re-issue any
  key created before this rule, otherwise the schema push will fail.
- Rotate `CONVEX_BRIDGE_SECRET`: it authorises the whole domain surface for
  every tenant.
- Do **not** set `ALLOW_LOCAL_AUTH_ORIGINS` on the production deployment. It
  permits localhost as an OAuth redirect target, which is a development-only
  convenience.

## Commands

| Command | Action |
| --- | --- |
| `pnpm check:dev-env` | Verify local development cannot target production |
| `pnpm dev` | Verify the environment, then start Next development server |
| `pnpm dev:backend` | Verify the environment, then sync Convex dev functions |
| `pnpm check` | Type-check Next, Convex, and tests |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run unit and integration-style tests |
| `pnpm test:convex` | Run Convex tests |
| `pnpm build` | Build the Next application |
| `pnpm preview` | Build and preview the OpenNext Worker |
| `pnpm deploy` | Deploy Convex functions, then the Worker |
| `pnpm api:key --nombre "..."` | Create an API key without a user session (the app does it from Settings) |

## License

Distributed under the MIT License. See [LICENSE](./LICENSE).
