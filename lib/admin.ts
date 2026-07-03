import { getRequestUser } from "@/lib/request-user";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_ALLOWLIST || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Page/server components — redirects when unauthorized. */
export async function assertAdmin() {
  const user = getRequestUser();
  if (!user) redirect("/");
  if (!getAdminEmails().includes(user.email.toLowerCase())) redirect("/dashboard");
  return user;
}

/** API route handlers — JSON 401/403 instead of redirect (avoids 307 on fetch). */
export function requireAdminApi() {
  const user = getRequestUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAdminEmails().includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return user;
}

export async function getSessionUser() {
  return getRequestUser();
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase());
}
