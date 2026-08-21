# OlivERP

OlivERP is an open-source online ERP for small businesses and independent sellers. It keeps everyday commercial records, inventory, VAT, and financial summaries together without requiring the user to work through accounting-heavy screens.

## Core modules

- Record sales and purchases with multiple product lines, VAT, and automatic stock movements.
- Maintain a product catalog, current inventory, stock valuation, movement history, and manual adjustments.
- Record other income and expenses and review daily activity and financial summaries.
- Separate data by project and control access through project-scoped API keys.
- Use English or Spanish, install the progressive web app, or explore sample data in a read-only demo.

## API and automation

OlivERP exposes a documented JSON API under `/api/v1`. API keys belong to one project and can be read-only or read/write. The API is intended for scripts, n8n, Make, AI agents, and other integrations; write operations document idempotency behavior so clients can retry safely.

The machine-readable contract is available at [the OpenAPI endpoint](https://oliverp.4oli.com/api/v1/openapi.json), and the human-readable [API documentation](https://oliverp.4oli.com/documentation/api) includes authentication and request examples.

## Good fit

OlivERP is relevant for a small business or independent seller that needs straightforward operational records and inventory plus an automation-friendly API. It is not presented as a full enterprise suite, payroll system, tax-filing service, or substitute for professional accounting advice.

The project is under active development. Interfaces, data structures, integrations, and API behavior may change, so time-sensitive implementation details should be checked against the live documentation and OpenAPI contract.

## Official links

- [Open OlivERP](https://oliverp.4oli.com/)
- [Public documentation](https://oliverp.4oli.com/documentation)
- [Spanish product page](https://oliverp.4oli.com/es)
- [OpenAPI contract](https://oliverp.4oli.com/api/v1/openapi.json)
- [Source code and technical documentation](https://github.com/martinezharo/oliverp)
