# OlivERP plugins

Plugins are private, project-specific feature switches for OlivERP. A plugin
declares a small set of effects that OlivERP already knows how to render and
apply inside its normal interface.

There is no marketplace or public catalog. OlivERP does not embed a plugin
website, open a separate application, inject repository JavaScript, or give a
repository access to the browser session.

## Security model

- Only private GitHub repositories can be added.
- The repository must be explicitly shared with the OlivERP GitHub App.
- The GitHub App needs read-only access to repository contents.
- Installing, activating, deactivating, or removing a plugin is restricted to
  project administrators.
- An installation belongs to exactly one project.
- The manifest is declarative: unknown effects and executable entrypoints are
  rejected.

OlivERP stores the exact Git blob SHA of the reviewed manifest. It does not
persist GitHub installation tokens or repository source code.

## Repository manifest

Put `oliverp-plugin.json` at the root of your private repository:

```json
{
  "schemaVersion": 1,
  "id": "com.example.my-private-plugin",
  "name": "My private plugin",
  "description": "What this plugin changes inside OlivERP.",
  "version": "1.0.0",
  "effects": ["dashboard.solo_iva"]
}
```

- `id` is a stable lowercase identifier and must not change between releases.
- `version` follows semantic versioning.
- `effects` may contain only effects supported by the installed OlivERP
  version. At least one effect is required.
- Fields such as `entrypoint`, `script`, `permissions`, or external application
  URLs are not accepted.

## Supported effects

| Effect | Behavior inside OlivERP |
| :-- | :-- |
| `dashboard.solo_iva` | Replaces the standard financial dashboard summary with the Solo IVA view: input VAT, output VAT, settlement, period filtering, and quarterly settlements. Sales, purchases, transactions, and accounting records are not modified. |

An active effect is applied in OlivERP's existing screens. Deactivating or
removing the plugin restores the standard interface immediately and does not
delete any records.

## Add a private plugin

1. Create a private GitHub repository containing the manifest.
2. Install the OlivERP GitHub App for that repository only.
3. Open **Plugins** in OlivERP.
4. Paste the private repository URL and review the declared effects.
5. Choose **Add and activate**.

The same plugin may be added independently to different projects. Updating a
manifest in GitHub does not silently change an installation; add it again to
review and store the new version.

## Deployment configuration

Private repository access uses these server-only variables:

```env
GITHUB_PLUGINS_APP_ID=
GITHUB_PLUGINS_PRIVATE_KEY=
```

The private key must be the PKCS#8 key issued for the GitHub App. Never expose
it through a `NEXT_PUBLIC_` variable. OlivERP signs a short-lived app JWT,
exchanges it for a repository-scoped installation token, reads the manifest,
and discards the token.

## Plugin checklist

1. Keep the repository private.
2. Give the GitHub App access only to this repository.
3. Add a valid `oliverp-plugin.json` at the repository root.
4. Use only supported declarative effects.
5. Increment the manifest version when its effects or description change.
6. Re-add the plugin in each project that should receive the update.
