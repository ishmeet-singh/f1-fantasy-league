import { jwtVerify } from "jose";

export type VerifiedSession = {
  id: string;
  email: string;
};

/** Verify a Supabase access-token JWT locally (no Auth server round-trip). */
export async function verifyAccessToken(
  accessToken: string,
  jwtSecret: string
): Promise<VerifiedSession | null> {
  if (!accessToken?.trim()) return null;

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(accessToken, secret);
    const id = payload.sub;
    if (!id) return null;
    const email = typeof payload.email === "string" ? payload.email : "";
    return { id, email };
  } catch {
    return null;
  }
}
