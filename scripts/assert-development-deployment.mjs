import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function parseEnvFile(contents) {
  const result = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const name = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (!value.startsWith('"') && !value.startsWith("'")) {
      value = value.replace(/\s+#.*$/, "");
    }
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    result[name] = value;
  }

  return result;
}

export function validateDevelopmentEnvironment(env) {
  const errors = [];
  const deployment = env.CONVEX_DEPLOYMENT?.trim();
  const convexUrl = env.NEXT_PUBLIC_CONVEX_URL?.trim();

  if (!deployment) {
    errors.push("CONVEX_DEPLOYMENT is missing. Select a personal dev deployment first.");
  } else if (deployment.startsWith("prod:")) {
    errors.push(`CONVEX_DEPLOYMENT points to production (${deployment}).`);
  }

  if (!convexUrl) {
    errors.push("NEXT_PUBLIC_CONVEX_URL is missing.");
  } else if (deployment?.startsWith("dev:")) {
    const deploymentName = deployment.slice("dev:".length).split(/\s/, 1)[0];
    let hostname;
    try {
      hostname = new URL(convexUrl).hostname;
    } catch {
      errors.push(`NEXT_PUBLIC_CONVEX_URL is not a valid URL (${convexUrl}).`);
    }

    if (hostname && hostname !== `${deploymentName}.convex.cloud`) {
      errors.push(
        `Deployment mismatch: ${deployment} cannot use ${convexUrl}. Expected https://${deploymentName}.convex.cloud.`,
      );
    }
  }

  return errors;
}

function readLocalEnvironment() {
  let fileEnvironment = {};
  try {
    fileEnvironment = parseEnvFile(readFileSync(resolve(process.cwd(), ".env.local"), "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return { ...fileEnvironment, ...process.env };
}

function main() {
  const environment = readLocalEnvironment();
  const errors = validateDevelopmentEnvironment(environment);
  if (errors.length === 0) {
    console.log("Development environment uses an isolated Convex deployment.");
    if (environment.DEV_PUBLIC_URL) {
      console.log(`Open OlivERP at ${environment.DEV_PUBLIC_URL}`);
    }
    return;
  }

  console.error("Refusing to start development against an unsafe Convex configuration:");
  for (const error of errors) console.error(`- ${error}`);
  console.error("Run `pnpm exec convex deployment select dev`, then verify .env.local.");
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
