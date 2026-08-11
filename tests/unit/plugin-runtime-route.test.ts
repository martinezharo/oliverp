import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  backend: {
    pluginRuntime: vi.fn(),
    listDailyFinances: vi.fn(),
  },
  sessionBackend: vi.fn(),
}));

vi.mock("../../src/lib/legacy-api", () => ({
  backendError: () => new Response(JSON.stringify({ error: "backend" }), { status: 500 }),
  jsonResponse: (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  }),
  sessionBackend: mocks.sessionBackend,
  unauthorizedResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
}));

const { POST } = await import("../../src/internal/api/plugins/render");

const installation = {
  pluginId: "com.example.vat",
  name: "VAT",
  version: "1.0.0",
  sourceSha: "0123456789abcdef0123456789abcdef01234567",
  runtimeProtocol: 1 as const,
  runtimeEndpoint: "https://plugin.example.com/render",
  slots: ["dashboard.summary" as const],
  permissions: ["finances:read" as const],
  enabled: true,
};

const view = {
  protocol: 1,
  plugin: { id: installation.pluginId, version: installation.version },
  slot: "dashboard.summary",
  title: "VAT summary",
  defaultPeriod: "year",
  periods: [{ id: "year", label: "Year", metrics: [{ label: "Output VAT", value: "€21.00", tone: "rose" }] }],
  table: {
    title: "Quarterly settlement",
    emptyMessage: "No entries",
    columns: [{ label: "Period", align: "left" }, { label: "Amount", align: "right" }],
    rows: [{ cells: [{ value: "Q1" }, { value: "€21.00", tone: "rose" }] }],
  },
};

function context(body: unknown) {
  return {
    locals: {},
    request: new Request("https://erp.test/api/plugins/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessionBackend.mockResolvedValue({ backend: mocks.backend, userId: "user-1" });
  mocks.backend.pluginRuntime.mockResolvedValue(installation);
  mocks.backend.listDailyFinances.mockResolvedValue([{ dia: "2026-08-01", iva_repercutido: 21, iva_soportado: 5 }]);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(view), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })));
});

describe("plugin runtime route", () => {
  it("sends only authorized finance data and returns a validated native view", async () => {
    const response = await POST(context({ projectId: 7, pluginId: installation.pluginId }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ title: "VAT summary" });
    expect(mocks.backend.pluginRuntime).toHaveBeenCalledWith(7, installation.pluginId);
    expect(mocks.backend.listDailyFinances).toHaveBeenCalledWith({ projectId: 7 });
    const [, request] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse(String(request?.body))).toEqual({
      protocol: 1,
      plugin: { id: installation.pluginId, version: installation.version },
      slot: "dashboard.summary",
      context: { projectId: 7 },
      data: { finances: [{ dia: "2026-08-01", iva_repercutido: 21, iva_soportado: 5 }] },
    });
  });

  it("refuses inactive plugins and ungranted capabilities", async () => {
    mocks.backend.pluginRuntime.mockResolvedValueOnce(null);
    expect((await POST(context({ projectId: 7, pluginId: installation.pluginId }))).status).toBe(404);

    mocks.backend.pluginRuntime.mockResolvedValueOnce({ ...installation, permissions: [] });
    expect((await POST(context({ projectId: 7, pluginId: installation.pluginId }))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("blocks private network runtimes before sending project data", async () => {
    mocks.backend.pluginRuntime.mockResolvedValueOnce({ ...installation, runtimeEndpoint: "https://127.0.0.1/render" });
    const response = await POST(context({ projectId: 7, pluginId: installation.pluginId }));
    expect(response.status).toBe(422);
    expect(mocks.backend.listDailyFinances).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects executable or mismatched runtime responses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ ...view, script: "alert(1)" })));
    expect((await POST(context({ projectId: 7, pluginId: installation.pluginId }))).status).toBe(502);

    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ ...view, plugin: { id: "another", version: "1.0.0" } })));
    expect((await POST(context({ projectId: 7, pluginId: installation.pluginId }))).status).toBe(502);
  });
});
