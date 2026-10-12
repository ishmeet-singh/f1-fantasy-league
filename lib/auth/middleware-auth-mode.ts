export type MiddlewareAuthMode = "local" | "network";

/** `network` = remote getUser(). `local` = JWT verify + refresh-on-expiry only. */
export function getMiddlewareAuthMode(): MiddlewareAuthMode {
  const mode = process.env.MIDDLEWARE_AUTH?.trim().toLowerCase();
  if (mode === "network") return "network";

  const jwtSecret = process.env.SUPABASE_JWT_SECRET?.trim();
  if (jwtSecret) return "local";

  if (mode === "local") {
    console.warn(
      "[middleware] MIDDLEWARE_AUTH=local but SUPABASE_JWT_SECRET is unset — falling back to network"
    );
  }

  return "network";
}
