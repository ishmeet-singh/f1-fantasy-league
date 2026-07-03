import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { verifyAccessToken } from "./verify-access-token";

const TEST_SECRET = "test-jwt-secret-for-unit-tests-only-32b";

async function signTestToken(
  sub: string,
  email: string,
  expiresInSeconds: number
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(new TextEncoder().encode(TEST_SECRET));
}

describe("verifyAccessToken", () => {
  it("accepts a valid session token", async () => {
    const token = await signTestToken("user-abc", "player@example.com", 3600);
    await expect(verifyAccessToken(token, TEST_SECRET)).resolves.toEqual({
      id: "user-abc",
      email: "player@example.com"
    });
  });

  it("rejects an expired token", async () => {
    const token = await signTestToken("user-abc", "player@example.com", -60);
    await expect(verifyAccessToken(token, TEST_SECRET)).resolves.toBeNull();
  });

  it("rejects when there is no session token", async () => {
    await expect(verifyAccessToken("", TEST_SECRET)).resolves.toBeNull();
    await expect(verifyAccessToken("   ", TEST_SECRET)).resolves.toBeNull();
  });

  it("rejects a tampered token", async () => {
    const token = await signTestToken("user-abc", "player@example.com", 3600);
    const [header, payload, signature] = token.split(".");
    const last = signature.slice(-1);
    const tampered = `${header}.${payload}.${signature.slice(0, -1)}${last === "a" ? "b" : "a"}`;
    await expect(verifyAccessToken(tampered, TEST_SECRET)).resolves.toBeNull();
  });
});
