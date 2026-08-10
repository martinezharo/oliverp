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

## Demo mode

If the Worker is missing its Convex URL or bridge secret, it deliberately falls
back to a read-only demo experience. The demo has mock projects, stock, and
financial data and does not require an account.

## Local development

Prerequisites: Node.js LTS, pnpm, and a Convex project.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Set `NEXT_PUBLIC_CONVEX_URL` to the `https://...convex.cloud` URL of the Convex
deployment used by the browser. Set `CONVEX_BRIDGE_SECRET` to the same random
value in the Worker and in Convex. The bridge secret is server-only.

Convex functions run on the deployment, not from the working tree: a new query
or mutation has to be pushed with `pnpm exec convex deploy` (or `pnpm deploy`)
before the UI can call it. Until then the call fails, and because production
masks internal errors the browser only sees `[Request ID: …] Server Error`.

### One GitHub OAuth App for local development and production

Convex Auth owns the OAuth flow. This project deliberately uses one canonical
Convex deployment for both local Next development and the production Worker,
following the same pattern as KlipCode. That means the existing GitHub OAuth
App needs only one callback URL:

`https://reminiscent-cricket-450.convex.site/api/auth/callback/github`

Add the credentials to that single Convex deployment, never to a
`NEXT_PUBLIC_` variable:

   ```bash
   pnpm exec auth --prod --web-server-url https://erp-1f3.pages.dev
   pnpm exec convex env set AUTH_GITHUB_ID
   pnpm exec convex env set AUTH_GITHUB_SECRET
   pnpm exec convex env set SITE_URL https://erp-1f3.pages.dev
   pnpm exec convex env set CONVEX_BRIDGE_SECRET
   ```

The one-time `pnpm exec auth` setup generates the internal `JWT_PRIVATE_KEY`
and `JWKS` values required to sign Convex Auth sessions. Keep those values in
Convex only; they are not application or GitHub keys.

The callback is on Convex, not on the Next app. Both environments use
`https://reminiscent-cricket-450.convex.cloud`, so the same OAuth App works in
local development and production. `SITE_URL` is only Convex Auth's public
post-login origin; it is not a credential. There are no `BETTER_AUTH_SECRET`,
`OAUTH_PROXY_*`, or application-level GitHub variables. When the new Worker
gets its final public URL, update only `SITE_URL`; the GitHub callback and app
remain unchanged.

A separate Convex deployment would need its own GitHub OAuth App, because the
callback lives on the deployment host and a GitHub OAuth App accepts a single
callback URL. That is the reason this repository keeps one deployment.

The first deployment can be configured with:

```bash
pnpm exec convex dev --configure new
```

For local development, keep `NEXT_PUBLIC_CONVEX_URL` pointed at the canonical
deployment above. For production, the same value is defined in
`wrangler.jsonc`.

## Cloudflare Worker deployment

The repository is configured for one OpenNext Worker, not Pages:

```bash
pnpm build
pnpm preview
pnpm deploy
```

Configure these Worker bindings:

| Name | Type | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | variable | Public Convex cloud URL used by the browser; set in `wrangler.jsonc` |
| `CONVEX_BRIDGE_SECRET` | secret | Server-only bridge credential, matching Convex |

`AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` belong only to Convex. Convex
automatically provides `CONVEX_SITE_URL` to its functions for the auth issuer.

The generated Worker entrypoint is `.open-next/worker.js`; `wrangler.jsonc`
defines the Worker, assets, self-reference service, and `nodejs_compat`.

## Existing data

The Convex backend keeps the legacy numeric ids used by the UI and API. If an
old Supabase database still needs to be imported, use the one-off migration:

```bash
SUPABASE_SECRET_KEY=... pnpm migrate:supabase
```

The Supabase key is only needed for that command and is not an application
runtime variable.

## Commands

| Command | Action |
| --- | --- |
| `pnpm dev` | Start Next development server |
| `pnpm check` | Type-check Next, Convex, and tests |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run unit and integration-style tests |
| `pnpm test:convex` | Run Convex tests |
| `pnpm build` | Build the Next application |
| `pnpm preview` | Build and preview the OpenNext Worker |
| `pnpm deploy` | Deploy Convex functions, then the Worker |
| `pnpm api:key --nombre "..."` | Create an API key |

## License

Distributed under the MIT License. See [LICENSE](./LICENSE).
