import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  hasSupabaseSessionCookie,
  readSessionTokensFromRequest
} from "./middleware-session-cookie";

const SUPABASE_URL = "https://gsyaptwutlscabndpxnx.supabase.co";

function requestWithCookies(cookies: Record<string, string>): NextRequest {
  const headers = new Headers();
  const serialized = Object.entries(cookies)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
  if (serialized) headers.set("cookie", serialized);
  return new NextRequest("https://example.com/", { headers });
}

describe("middleware-session-cookie", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  it("reads access_token from base64 auth cookie", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    const payload = JSON.stringify({
      access_token: "tok",
      refresh_token: "ref"
    });
    const encoded = `base64-${btoa(payload)}`;
    const req = requestWithCookies({
      "sb-gsyaptwutlscabndpxnx-auth-token": encoded
    });

    expect(hasSupabaseSessionCookie(req)).toBe(true);
    expect(readSessionTokensFromRequest(req)).toEqual({
      access_token: "tok",
      refresh_token: "ref"
    });
  });

  it("joins chunked cookies", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    const payload = JSON.stringify({ access_token: "chunked" });
    const encoded = `base64-${btoa(payload)}`;
    const half = Math.ceil(encoded.length / 2);
    const req = requestWithCookies({
      "sb-gsyaptwutlscabndpxnx-auth-token.0": encoded.slice(0, half),
      "sb-gsyaptwutlscabndpxnx-auth-token.1": encoded.slice(half)
    });

    expect(readSessionTokensFromRequest(req)?.access_token).toBe("chunked");
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  });
});
