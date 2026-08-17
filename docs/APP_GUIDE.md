# Using OlivERP

OlivERP is designed to help you record day-to-day business activity without
having to think in accounting terms. Start with a project, add its products,
and record what you buy and sell. Stock, VAT, and financial summaries update
from those operations.

## Start here

1. Sign in with the GitHub account authorized for your OlivERP deployment.
2. Create or select a project in **Settings**. Projects keep their products,
   operations, stock, and integrations separate.
3. Add your products from **Stock**. Include the purchase cost, sale price, and
   available units when you create each product.
4. Record purchases when products enter your inventory and sales when they
   leave it.
5. Use **Dashboard**, **Transactions**, and **History** to review the result.

The public demo can be opened without an account. It uses sample data and is
read-only, so it is useful for exploring the interface but does not represent
your business data.

## The main sections

### Dashboard

The dashboard gives you a quick view of the selected project:

- income, expenses, balance, and VAT balance;
- monthly and quarterly figures;
- a projection for the current period; and
- shortcuts to record a sale, purchase, or other income/expense.

### Stock

Stock lists products and the information needed to make inventory decisions:

- current units and inventory value;
- purchase and sale values;
- unit and recent profit estimates; and
- estimated days of stock coverage.

Open a product's history to review its movements or record a manual adjustment.
Use manual adjustments for corrections such as a stock count, breakage, or a
giveaway; use a purchase or sale for a real business operation.

### Transactions

Transactions can be viewed as a daily financial summary or as a searchable
list. The list can be filtered by concept, product, type, channel, date, and
amount.

- A **sale** records income and reduces stock.
- A **purchase** records an expense and increases stock.
- An **income** or **expense** records a financial movement that is not a sale
  or purchase.

VAT is kept separate in the financial totals: purchases contribute input VAT
and sales contribute output VAT. Prices in the application include VAT.

### History

History groups the project's financial activity by month, quarter, year, or
the complete period. Use it to compare income, expenses, balance, VAT balance,
and URP over time.

### Settings

Settings is where you manage your projects and account. Project administrators
can also create, review, and revoke API keys for integrations. A key belongs to
one project and can be read-only or read/write; the secret is shown only once.

The install option in Settings can add OlivERP to a supported browser or
device as an installable app.

### Plugins

Plugins are private, project-specific extensions. A project administrator can
paste a private GitHub repository, review the behavior declared by its
manifest, and activate it for that project. OlivERP validates the supported
hooks and does not execute arbitrary repository code in the browser.

See the [plugin documentation](https://github.com/martinezharo/oliverp/blob/main/docs/PLUGINS.md)
for the manifest format and the available hooks.

## Working with integrations

The API is intended for scripts, n8n, Make, AI agents, and other automation
tools. Create a project-scoped API key in Settings and use the public OpenAPI
contract to discover the available operations.

See the [API reference](https://github.com/martinezharo/oliverp/blob/main/docs/API.md)
for authentication, permissions, request examples, safe retries, and endpoint
details.

## Important rules

- Choose the correct project before recording or reviewing data.
- Record purchases and sales as they happen so stock and financial totals stay
  aligned.
- Use a manual stock adjustment only to correct inventory, not to represent a
  sale or purchase.
- Keep API keys private. Revoke a key immediately if it may have been exposed.
- The demo is intentionally read-only; changes made there are not real records.
