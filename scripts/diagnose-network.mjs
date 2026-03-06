#!/usr/bin/env node

import https from "node:https";

const registry = process.env.npm_config_registry || process.env.NPM_REGISTRY_URL || "https://registry.npmjs.org/";
const pingUrl = new URL("-/ping", registry).toString();

function pickEnv(keys) {
  return keys.map((key) => [key, process.env[key]]).filter(([, value]) => Boolean(value));
}

function request(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      const { statusCode = 0 } = res;
      res.resume();
      resolve(statusCode);
    });
    req.on("error", reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error("Timed out while reaching npm registry"));
    });
  });
}

const proxyVars = pickEnv([
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "http_proxy",
  "https_proxy",
  "npm_config_proxy",
  "npm_config_https_proxy",
  "npm_config_http_proxy"
]);

console.log(`[diagnose-network] npm registry: ${registry}`);
if (proxyVars.length) {
  console.log("[diagnose-network] proxy-related env vars:");
  for (const [key, value] of proxyVars) {
    console.log(`  - ${key}=${value}`);
  }
}

try {
  const statusCode = await request(pingUrl);
  if (statusCode >= 200 && statusCode < 400) {
    console.log(`[diagnose-network] Registry reachable (status ${statusCode}).`);
    process.exit(0);
  }

  console.error(`[diagnose-network] Registry responded with ${statusCode}.`);
  console.error("[diagnose-network] Fix by allowing registry access via your proxy, or by using an internal npm mirror:");
  console.error("  npm config set registry https://<your-internal-npm-registry>/");
  process.exit(1);
} catch (error) {
  const message = error instanceof Error && error.message ? error.message : String(error);
  console.error(`[diagnose-network] ${message}`);
  console.error("[diagnose-network] Fix by validating proxy config or setting NPM_REGISTRY_URL to a reachable mirror.");
  process.exit(1);
}
