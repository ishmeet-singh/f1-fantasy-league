import { describe, expect, it, afterEach } from "vitest";
import { getMiddlewareAuthMode } from "./middleware-auth-mode";

describe("getMiddlewareAuthMode", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("defaults to network when unset and no JWT secret", () => {
    delete process.env.MIDDLEWARE_AUTH;
    delete process.env.SUPABASE_JWT_SECRET;
    expect(getMiddlewareAuthMode()).toBe("network");
  });

  it("defaults to local when JWT secret is set", () => {
    delete process.env.MIDDLEWARE_AUTH;
    process.env.SUPABASE_JWT_SECRET = "secret";
    expect(getMiddlewareAuthMode()).toBe("local");
  });

  it("honors explicit network mode even with JWT secret", () => {
    process.env.MIDDLEWARE_AUTH = "network";
    process.env.SUPABASE_JWT_SECRET = "secret";
    expect(getMiddlewareAuthMode()).toBe("network");
  });

  it("uses local when configured with JWT secret", () => {
    process.env.MIDDLEWARE_AUTH = "local";
    process.env.SUPABASE_JWT_SECRET = "secret";
    expect(getMiddlewareAuthMode()).toBe("local");
  });

  it("falls back to network when local is set without JWT secret", () => {
    process.env.MIDDLEWARE_AUTH = "local";
    delete process.env.SUPABASE_JWT_SECRET;
    expect(getMiddlewareAuthMode()).toBe("network");
  });
});
