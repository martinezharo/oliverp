import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const workflow = JSON.parse(
  await readFile(
    new URL(
      "../../automations/n8n/wallapop-gmail-to-erp.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  nodes: Array<{
    name: string;
    type?: string;
    parameters?: {
      jsCode?: string;
      simple?: boolean;
      filters?: { q?: string };
    };
  }>;
};

const parserCode = workflow.nodes.find(
  (node) => node.name === "Parse marketplace sale",
)?.parameters?.jsCode;

if (!parserCode) throw new Error("The marketplace workflow has no parser node.");

function parseMessage(message: Record<string, unknown>) {
  const run = new Function("$json", "$env", parserCode!);
  return run(message, { ERP_PROJECT_ID: "7" }) as Array<{
    json: Record<string, unknown>;
  }>;
}

describe("Marketplace n8n parser", () => {
  it("requests full Gmail bodies for the parser", () => {
    const trigger = workflow.nodes.find(
      (node) => node.type === "n8n-nodes-base.gmailTrigger",
    );

    expect(trigger?.parameters).toMatchObject({ simple: false });
    const gmailQuery = trigger?.parameters?.filters?.q ?? "";
    expect(gmailQuery).toContain("$env.ERP_MARKETPLACE_EXTRA_GMAIL_QUERY");
    expect(gmailQuery).toContain("from:info@wallapop.com");
    expect(gmailQuery).toContain("from:no-reply@vinted.es");
    expect(gmailQuery).not.toMatch(/@gmail\.com/i);
  });

  it("parses a plain-text confirmation", () => {
    const [item] = parseMessage({
      id: "gmail-plain-1",
      textPlain: [
        "Venta confirmada",
        "Comprado por:",
        "Antonio R.",
        "Mando Xiaomi XMRM-006 a Estrenar 3,49 €",
        "Fecha de compra: 03/08/2026",
      ].join("\n"),
    });

    expect(item.json).toMatchObject({
      proyecto_id: 7,
      origen_id: "gmail-plain-1",
      canal: "Wallapop",
      fecha: "2026-08-03",
      comprador_nombre: "Antonio R.",
      titulo_producto: "Mando Xiaomi XMRM-006 a Estrenar",
      importe_total: 3.49,
      unidades: 1,
    });
  });

  it("parses an HTML-shaped confirmation and decimal-dot prices", () => {
    const [item] = parseMessage({
      messageId: "gmail-html-1",
      textHtml: [
        "<div>Comprado por:</div>",
        "<div>María</div>",
        "<div>Mando LG MR20GA con Micrófono y Puntero a Estrenar 12.90 &euro;</div>",
        "<div>Fecha de compra: 4/8/2026</div>",
      ].join(""),
    });

    expect(item.json).toMatchObject({
      origen_id: "gmail-html-1",
      canal: "Wallapop",
      fecha: "2026-08-04",
      comprador_nombre: "María",
      titulo_producto: "Mando LG MR20GA con Micrófono y Puntero a Estrenar",
      importe_total: 12.9,
    });
  });

  it("parses Gmail html with separate product, price, and date elements", () => {
    const [item] = parseMessage({
      id: "gmail-wallapop-html-1",
      html: [
        "<div>Comprado por:</div>",
        "<div>Carol L.</div>",
        "<p>Mando Xiaomi XMRM-010 Bluetooth Voz Nuevo</p>",
        "<p>5.50€</p>",
        "<p>Enviar desde un punto de entrega</p>",
        "<p>0.00€</p>",
        "<p>Total</p>",
        "<p>5.50€</p>",
        "<p>Fecha de compra:</p>",
        "<span>13/8/26</span>",
      ].join(""),
    });

    expect(item.json).toMatchObject({
      origen_id: "gmail-wallapop-html-1",
      canal: "Wallapop",
      fecha: "2026-08-13",
      comprador_nombre: "Carol L.",
      titulo_producto: "Mando Xiaomi XMRM-010 Bluetooth Voz Nuevo",
      importe_total: 5.5,
      unidades: 1,
    });
  });

  it("parses the Vinted confirmation shape and uses the Gmail message date", () => {
    const [item] = parseMessage({
      id: "gmail-vinted-1",
      subject: "Has vendido un artículo en Vinted",
      from: "Tu equipo de Vinted <no-reply@vinted.es>",
      date: "2026-08-08T21:38:00+02:00",
      textPlain: [
        "Hola, oliver.mar:",
        "ahmedh831 ha comprado",
        "Mando Samsung BN59-01358D a Estrenar",
        "3,50 €",
        "Transfiere el pago del comprador cuando haya finalizado la transacción.",
        "Envía el pedido en los próximos 5 días.",
      ].join("\n"),
    });

    expect(item.json).toMatchObject({
      proyecto_id: 7,
      origen_id: "gmail-vinted-1",
      canal: "Vinted",
      fecha: "2026-08-08",
      comprador_nombre: "ahmedh831",
      titulo_producto: "Mando Samsung BN59-01358D a Estrenar",
      importe_total: 3.5,
      unidades: 1,
    });
  });

  it("fails closed when the email shape is not recognized", () => {
    expect(() =>
      parseMessage({ id: "invalid", textPlain: "Venta confirmada" }),
    ).toThrow("No se encontro el bloque Comprado por");
  });
});
