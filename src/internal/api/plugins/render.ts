import { z } from "zod";

import type { APIRoute } from "@/lib/server-context";
import { backendError, jsonResponse, sessionBackend, unauthorizedResponse } from "@/lib/legacy-api";
import { pluginDashboardViewSchema } from "@/lib/plugins";

const requestSchema = z.object({
  projectId: z.number().int().positive(),
  pluginId: z.string().min(1).max(80),
}).strict();

function safeRuntimeUrl(value: string): URL | null {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "0.0.0.0" || host === "127.0.0.1" || host === "::1") return null;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)?.slice(1).map(Number);
  if (ipv4 && (ipv4.some((part) => part > 255) || ipv4[0] === 10 || ipv4[0] === 127 || (ipv4[0] === 169 && ipv4[1] === 254) || (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) || (ipv4[0] === 192 && ipv4[1] === 168))) return null;
  if (host.includes(":")) return null;
  return url;
}

export const POST: APIRoute = async (context) => {
  const session = await sessionBackend(context);
  if (!session) return unauthorizedResponse();

  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await context.request.json());
  } catch {
    return jsonResponse({ error: "A valid project and plugin are required." }, 400);
  }

  try {
    const plugin = await session.backend.pluginRuntime(input.projectId, input.pluginId);
    if (!plugin) return jsonResponse({ error: "The plugin is not active for this project." }, 404);
    if (!plugin.slots.includes("dashboard.summary") || !plugin.permissions.includes("finances:read")) {
      return jsonResponse({ error: "The plugin is not allowed to render this dashboard slot." }, 403);
    }
    const endpoint = safeRuntimeUrl(plugin.runtimeEndpoint);
    if (!endpoint) return jsonResponse({ error: "The plugin runtime endpoint is not allowed." }, 422);

    const finances = (await session.backend.listDailyFinances({ projectId: input.projectId })).slice(0, 4_000);
    const response = await fetch(endpoint, {
      method: "POST",
      // Cloudflare Workers supports only `follow` and `manual`. Keep redirects
      // manual so an installed runtime cannot move a finance payload to an
      // unreviewed host after installation.
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "OlivERP-Plugin-Runtime/1",
        "X-OlivERP-Plugin-Source": plugin.sourceSha,
      },
      body: JSON.stringify({
        protocol: plugin.runtimeProtocol,
        plugin: { id: plugin.pluginId, version: plugin.version },
        slot: "dashboard.summary",
        context: { projectId: input.projectId },
        data: { finances },
      }),
    });
    if (response.status >= 300 && response.status < 400) {
      return jsonResponse({ error: "The plugin runtime attempted an unapproved redirect." }, 502);
    }
    if (!response.ok) return jsonResponse({ error: `The plugin runtime returned HTTP ${response.status}.` }, 502);
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > 128_000) return jsonResponse({ error: "The plugin response is too large." }, 502);
    const source = await response.text();
    if (source.length > 128_000) return jsonResponse({ error: "The plugin response is too large." }, 502);
    let document: unknown;
    try { document = JSON.parse(source); } catch { return jsonResponse({ error: "The plugin runtime returned invalid JSON." }, 502); }
    const parsed = pluginDashboardViewSchema.safeParse(document);
    if (!parsed.success || parsed.data.plugin.id !== plugin.pluginId || parsed.data.plugin.version !== plugin.version) {
      return jsonResponse({ error: "The plugin runtime response does not satisfy its installed contract." }, 502);
    }
    return jsonResponse(parsed.data);
  } catch (error) {
    return backendError(error);
  }
};
