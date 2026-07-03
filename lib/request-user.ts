import { headers } from "next/headers";
import { NextResponse } from "next/server";

export type RequestUser = { id: string; email: string };

/**
 * User identity forwarded by middleware after a single edge auth check.
 * Avoids a second getUser() in layout and pages on the same navigation.
 */
export function getRequestUser(): RequestUser | null {
  const h = headers();
  const id = h.get("x-user-id");
  if (!id) return null;
  return { id, email: h.get("x-user-email") ?? "" };
}

/** API route handlers — JSON 401 instead of redirect (avoids 307 on fetch). */
export function requireUserApi(): RequestUser | NextResponse {
  const user = getRequestUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return user;
}
