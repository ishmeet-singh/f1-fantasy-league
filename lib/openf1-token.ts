/**
 * Optional OpenF1 OAuth2 (password grant).
 * During live F1 sessions the public API returns 401 for all endpoints unless authenticated.
 * @see https://openf1.org/auth.html
 */

type TokenCache = { token: string; expiresAtMs: number };

let cache: TokenCache | null = null;

function openF1Credentials() {
  const username = process.env.OPENF1_USERNAME?.trim();
  const password = process.env.OPENF1_PASSWORD?.trim();
  if (!username || !password) return null;
  return { username, password };
}

/**
 * Returns a Bearer token when OPENF1_USERNAME + OPENF1_PASSWORD are set; otherwise null.
 * Caches the token until shortly before expiry (tokens last ~1h).
 */
export async function getOpenF1BearerToken(baseUrl: string): Promise<string | null> {
  const creds = openF1Credentials();
  if (!creds) return null;

  const now = Date.now();
  if (cache && cache.expiresAtMs > now + 60_000) {
    return cache.token;
  }

  const origin = baseUrl.replace(/\/$/, "");
  const res = await fetch(`${origin}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: creds.username,
      password: creds.password,
    }).toString(),
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(
      `OpenF1 token request failed: ${res.status} — ${bodyText.slice(0, 400)}`
    );
  }

  let data: { access_token?: string; expires_in?: string | number };
  try {
    data = JSON.parse(bodyText) as { access_token?: string; expires_in?: string | number };
  } catch {
    throw new Error(`OpenF1 token response was not JSON: ${bodyText.slice(0, 200)}`);
  }

  if (!data.access_token) {
    throw new Error("OpenF1 token response missing access_token");
  }

  const expiresInSec = Number(data.expires_in) || 3600;
  const refreshBufferMs = 120_000;
  cache = {
    token: data.access_token,
    expiresAtMs: now + expiresInSec * 1000 - refreshBufferMs,
  };

  return cache.token;
}

export async function openF1AuthHeaders(baseUrl: string): Promise<HeadersInit> {
  const headers: Record<string, string> = { accept: "application/json" };
  const token = await getOpenF1BearerToken(baseUrl);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
