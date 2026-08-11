# OlivERP plugins

Plugins are private, project-specific extensions installed from GitHub repository
URLs. They run their own backend logic and return a restricted view document that
OlivERP renders with its native components.

There is no marketplace or public catalog. A plugin never opens a separate
application, injects JavaScript into OlivERP, or receives the browser session.
Installed plugins persist in the OlivERP account for each project.

## How execution works

1. An administrator pastes a private GitHub repository URL.
2. OlivERP reads and validates `oliverp-plugin.json` through its GitHub App.
3. The administrator reviews the requested UI slots and data permissions.
4. OlivERP stores the exact manifest source SHA and installation for the project.
5. When a supported slot is displayed, the OlivERP server sends only the granted
   data to the plugin runtime over HTTPS.
6. OlivERP validates the response and renders it with trusted native components.

Plugin source code runs only in the plugin's deployed runtime. It does not run in
the OlivERP Worker or in the user's browser.

## Security model

- Plugin repositories must be private and explicitly shared with the OlivERP
  GitHub App using read-only contents access.
- Only project administrators can install, activate, deactivate, or remove a
  plugin. Project members can use active plugins.
- Every installation belongs to exactly one project.
- The install dialog shows each requested slot and permission before activation.
- Unknown slots, permissions, manifest fields, protocols, and response fields
  are rejected.
- Runtime endpoints must use public HTTPS URLs. Local and private network targets
  are blocked.
- Runtime responses are size-limited and time-limited, and cannot contain HTML,
  scripts, event handlers, or arbitrary CSS.
- Only one active plugin may occupy a given UI slot. Activating another plugin
  for that slot deactivates the previous one.

OlivERP does not persist GitHub installation tokens or repository source code.
The remote plugin runtime is trusted with the data covered by its approved
permissions, so install only plugins whose code and operator you trust.

## Repository manifest

Put `oliverp-plugin.json` at the root of the private repository:

```json
{
  "schemaVersion": 1,
  "id": "com.example.my-private-plugin",
  "name": "My private plugin",
  "description": "A focused project finance summary.",
  "version": "1.0.0",
  "runtime": {
    "protocol": 1,
    "endpoint": "https://my-plugin.example.workers.dev/render"
  },
  "slots": ["dashboard.summary"],
  "permissions": ["finances:read"]
}
```

- `id` is a stable lowercase identifier and must not change between releases.
- `version` follows semantic versioning.
- `runtime.endpoint` is the deployed HTTPS handler. It is an API endpoint, not a
  plugin webpage.
- `slots` declares where validated output may appear.
- `permissions` declares which project data the runtime may receive.
- The manifest is strict: additional fields are rejected.

## Supported capabilities

| Capability | Current value | Meaning |
| :-- | :-- | :-- |
| UI slot | `dashboard.summary` | Replaces the standard dashboard summary with a native metrics and table view. |
| Data permission | `finances:read` | Receives daily project finance summaries when that dashboard slot loads. |

The finance payload is delivered only from OlivERP's server to the installed
runtime. It contains the same daily aggregate rows used by the normal dashboard;
it does not include the user's cookie or Convex session token.

## Runtime request

The endpoint receives `POST` requests with JSON shaped like this:

```json
{
  "protocol": 1,
  "plugin": { "id": "com.example.my-private-plugin", "version": "1.0.0" },
  "slot": "dashboard.summary",
  "context": { "projectId": 123 },
  "data": {
    "finances": []
  }
}
```

The finance rows are the daily report records returned by OlivERP's finance
backend. Plugins should ignore no fields silently: validate the request, reject
unsupported protocol or slot values, and avoid logging financial payloads.

## Native dashboard response

Return JSON with protocol and plugin identity, a list of selectable periods and
metrics, and a table. Text lengths, row counts, tones, and column alignment are
validated by OlivERP. The full schema is intentionally closed so arbitrary UI
code cannot cross the plugin boundary.

```json
{
  "protocol": 1,
  "plugin": { "id": "com.example.my-private-plugin", "version": "1.0.0" },
  "slot": "dashboard.summary",
  "eyebrow": "Private plugin",
  "title": "Finance focus",
  "description": "A project-specific view.",
  "defaultPeriod": "year",
  "periods": [
    {
      "id": "year",
      "label": "Year",
      "metrics": [
        { "label": "Metric", "value": "€0.00", "tone": "primary" }
      ]
    }
  ],
  "table": {
    "title": "Breakdown",
    "emptyMessage": "No entries yet.",
    "columns": [
      { "label": "Period", "align": "left" },
      { "label": "Amount", "align": "right" }
    ],
    "rows": []
  }
}
```

Supported tones are `neutral`, `primary`, `rose`, `emerald`, and `amber`.

## Add or update a private plugin

1. Keep the GitHub repository private.
2. Deploy its runtime to a public HTTPS endpoint.
3. Give the OlivERP GitHub App read-only access to that repository only.
4. Open **Plugins** in OlivERP and paste the repository URL.
5. Review the runtime host, slots, and permissions.
6. Choose **Add and activate**.

The same plugin may be installed independently in different projects. Updating a
manifest in GitHub does not silently change an installation: paste the repository
URL again to review and store the new version and source SHA.

## OlivERP deployment configuration

Private repository access uses these server-only variables:

```env
GITHUB_PLUGINS_APP_ID=
GITHUB_PLUGINS_PRIVATE_KEY=
```

The private key may use the PKCS#1 PEM generated by GitHub or PKCS#8 PEM. Never
expose it through a `NEXT_PUBLIC_` variable. OlivERP signs a short-lived app JWT,
exchanges it for a repository-scoped installation token, reads the manifest, and
discards the token.
