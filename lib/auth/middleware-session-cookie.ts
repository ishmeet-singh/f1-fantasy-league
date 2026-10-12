import type { NextRequest } from "next/server";

type SessionTokens = {
  access_token: string;
  refresh_token?: string;
};

function storageKey(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const ref = new URL(url).hostname.split(".")[0];
  return `sb-${ref}-auth-token`;
}

function combineChunkValues(chunks: { name: string; value: string }[], prefix: string): string {
  const sorted = [...chunks].sort((a, b) => {
    const aIndex = a.name === prefix ? -1 : Number.parseInt(a.name.slice(prefix.length + 1), 10);
    const bIndex = b.name === prefix ? -1 : Number.parseInt(b.name.slice(prefix.length + 1), 10);
    return aIndex - bIndex;
  });
  return sorted.map((chunk) => chunk.value).join("");
}

function decodeBase64Utf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeSessionPayload(raw: string): SessionTokens | null {
  try {
    const json = raw.startsWith("base64-") ? decodeBase64Utf8(raw.slice("base64-".length)) : raw;
    const parsed = JSON.parse(json) as {
      access_token?: string;
      refresh_token?: string;
    };
    if (!parsed.access_token) return null;
    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token
    };
  } catch {
    return null;
  }
}

/** True when the browser sent a Supabase auth cookie (session may still be invalid). */
export function hasSupabaseSessionCookie(request: NextRequest): boolean {
  const prefix = storageKey();
  if (!prefix) return false;
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name === prefix || cookie.name.startsWith(`${prefix}.`));
}

/** Read Supabase session tokens from request cookies (no Auth server round-trip). */
export function readSessionTokensFromRequest(request: NextRequest): SessionTokens | null {
  const prefix = storageKey();
  if (!prefix) return null;

  const chunks = request.cookies
    .getAll()
    .filter((cookie) => cookie.name === prefix || cookie.name.startsWith(`${prefix}.`));
  if (!chunks.length) return null;

  return decodeSessionPayload(combineChunkValues(chunks, prefix));
}
