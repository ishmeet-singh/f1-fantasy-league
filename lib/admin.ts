import { getRequestUser } from "@/lib/request-user";
import { redirect } from "next/navigation";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_ALLOWLIST || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function assertAdmin() {
  const user = getRequestUser();
  if (!user) redirect("/");
  if (!getAdminEmails().includes(user.email.toLowerCase())) redirect("/dashboard");
  return user;
}

export async function getSessionUser() {
  return getRequestUser();
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase());
}
