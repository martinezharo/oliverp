# Marketplace Gmail -> OlivERP

Import `wallapop-gmail-to-erp.json` into n8n and attach a Gmail OAuth
credential to the Gmail Trigger node. It handles the supported Wallapop and
Vinted sale-confirmation emails. Configure these n8n variables without
committing them:

- `ERP_API_URL`: `https://oliverp.4oli.com`
- `ERP_API_KEY`: a project-pinned `erp_sk_...` key with `write` scope
- `ERP_PROJECT_ID`: the ERP project id, normally `1` for Octopus Control

The workflow searches for Wallapop and Vinted sale-confirmation messages. Add
installation-specific senders through the private n8n environment variable
`ERP_MARKETPLACE_EXTRA_GMAIL_QUERY`; the value is appended as a Gmail search
clause and is never stored in this repository. For example:

```dotenv
ERP_MARKETPLACE_EXTRA_GMAIL_QUERY='from:your-email@example.com subject:"Venta confirmada"'
```

Multiple senders can be combined with Gmail's `OR` syntax. The workflow parses
plain-text and Gmail HTML bodies, including Wallapop messages where the
product, price, shipping and purchase date are separate HTML elements, and
posts the structured event to `/api/v1/importaciones/marketplace`. The Gmail
message id is sent as both the source id and the idempotency key, so polling or
delivery retries are safe.

Before activating it, map each exact listing title to its product and
marketplace. For an existing product:

```bash
curl -X PATCH "$ERP_API_URL/api/v1/productos/PRODUCT_ID" \
  -H "Authorization: Bearer $ERP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"titulo_wallapop":"Mando Xiaomi XMRM-006 a Estrenar"}'

curl -X PATCH "$ERP_API_URL/api/v1/productos/PRODUCT_ID" \
  -H "Authorization: Bearer $ERP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"titulo_vinted":"Mando Samsung BN59-01358D a Estrenar"}'
```

The workflow deliberately stops with an error when the exact email title is not
mapped for that marketplace; it never guesses a product. Vinted emails use the
Gmail message date because the confirmation body does not include a purchase
date.
