import type { APIRoute } from "@/lib/server-context";
import { githubRepository, pluginManifestSchema } from "@/lib/plugins";
import { jsonResponse, sessionBackend, unauthorizedResponse } from "@/lib/legacy-api";

const MANIFEST_PATH = "oliverp-plugin.json";
const GITHUB_API = "https://api.github.com";

type GitHubContent = { content?: string; encoding?: string; sha?: string };
type GitHubRepository = { private?: boolean; visibility?: string };

function runtimeValue(context: Parameters<APIRoute>[0], name: string): string | undefined {
  const value = context.locals.runtime?.env?.[name];
  return typeof value === "string" && value.length > 0 ? value : process.env[name];
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function pemBytes(pem: string): ArrayBuffer {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(body);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
}

async function appJwt(appId: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1_000);
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId })));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${base64Url(new Uint8Array(signature))}`;
}

const githubHeaders = (authorization?: string) => ({
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
  "user-agent": "OlivERP-Plugin-Resolver",
  ...(authorization ? { authorization } : {}),
});

async function installationToken(owner: string, repo: string, appId?: string, privateKey?: string): Promise<string | null> {
  if (!appId || !privateKey) return null;
  const jwt = await appJwt(appId, privateKey);
  const installationResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/installation`, {
    headers: githubHeaders(`Bearer ${jwt}`),
  });
  if (!installationResponse.ok) return null;
  const installation = await installationResponse.json() as { id?: number };
  if (!installation.id) return null;
  const tokenResponse = await fetch(`${GITHUB_API}/app/installations/${installation.id}/access_tokens`, {
    method: "POST",
    headers: githubHeaders(`Bearer ${jwt}`),
  });
  if (!tokenResponse.ok) return null;
  const token = await tokenResponse.json() as { token?: string };
  return token.token ?? null;
}

async function readManifest(
  owner: string,
  repo: string,
  authorization?: string,
): Promise<{ response: Response; document?: GitHubContent }> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${MANIFEST_PATH}`, {
    headers: githubHeaders(authorization),
  });
  if (!response.ok) return { response };
  return { response, document: await response.json() as GitHubContent };
}

function decodeContent(document: GitHubContent): string | null {
  if (document.encoding !== "base64" || !document.content) return null;
  try {
    return atob(document.content.replaceAll("\n", ""));
  } catch {
    return null;
  }
}

export const POST: APIRoute = async (context) => {
  if (!(await sessionBackend(context))) return unauthorizedResponse();

  let body: { repositoryUrl?: unknown };
  try {
    body = await context.request.json() as { repositoryUrl?: unknown };
  } catch {
    return jsonResponse({ error: "A JSON body is required." }, 400);
  }
  const repository = typeof body.repositoryUrl === "string" ? githubRepository(body.repositoryUrl) : null;
  if (!repository) return jsonResponse({ error: "Enter a valid GitHub repository URL." }, 400);

  const appId = runtimeValue(context, "GITHUB_PLUGINS_APP_ID");
  const privateKey = runtimeValue(context, "GITHUB_PLUGINS_PRIVATE_KEY");
  if (!appId || !privateKey) {
    return jsonResponse({ error: "Private plugin installation is not configured on this OlivERP deployment." }, 503);
  }
  const token = await installationToken(repository.owner, repository.repo, appId, privateKey);
  if (!token) {
    return jsonResponse({ error: "The private repository is unavailable or the OlivERP GitHub App is not installed on it." }, 404);
  }
  const authorization = `Bearer ${token}`;
  const repositoryResponse = await fetch(`${GITHUB_API}/repos/${repository.owner}/${repository.repo}`, {
    headers: githubHeaders(authorization),
  });
  if (!repositoryResponse.ok) {
    return jsonResponse({ error: "GitHub could not verify the private repository." }, 502);
  }
  const repositoryDetails = await repositoryResponse.json() as GitHubRepository;
  if (repositoryDetails.private !== true && repositoryDetails.visibility !== "private") {
    return jsonResponse({ error: "Only private GitHub repositories can be added as OlivERP plugins." }, 422);
  }

  const result = await readManifest(repository.owner, repository.repo, authorization);
  if (!result.response.ok || !result.document) {
    return jsonResponse({
      error: result.response.status === 404
        ? "The private repository does not contain oliverp-plugin.json at its root."
        : "GitHub could not provide the plugin manifest.",
    }, result.response.status === 404 ? 404 : 502);
  }

  const source = decodeContent(result.document);
  if (!source || !result.document.sha) return jsonResponse({ error: "The plugin manifest could not be decoded." }, 422);
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return jsonResponse({ error: "oliverp-plugin.json is not valid JSON." }, 422);
  }
  const manifest = pluginManifestSchema.safeParse(parsed);
  if (!manifest.success) {
    return jsonResponse({ error: "oliverp-plugin.json does not satisfy the OlivERP plugin contract." }, 422);
  }
  return jsonResponse({
    ...manifest.data,
    repositoryUrl: repository.url,
    sourceSha: result.document.sha,
  });
};
