/** Route prefixes guarded by middleware — keep in sync with middleware.ts matcher. */

export const PROTECTED_PAGE_PREFIXES = [
  "/dashboard",
  "/picks",
  "/results",
  "/profile",
  "/admin",
  "/rules"
] as const;

/** User-facing APIs that need session headers from middleware. */
export const PROTECTED_USER_API_PREFIXES = ["/api/profile", "/api/picks"] as const;

export const ADMIN_API_PREFIX = "/api/admin";

export function isProtectedPage(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isAdminApi(pathname: string): boolean {
  return pathname === ADMIN_API_PREFIX || pathname.startsWith(`${ADMIN_API_PREFIX}/`);
}

export function isProtectedUserApi(pathname: string): boolean {
  return PROTECTED_USER_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Any API route that requires a logged-in session via middleware. */
export function isProtectedApi(pathname: string): boolean {
  return isProtectedUserApi(pathname) || isAdminApi(pathname);
}
