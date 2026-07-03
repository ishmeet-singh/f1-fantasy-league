export type MiddlewareAuthMode = "local" | "network";

/** `network` = remote getUser() (default). `local` = JWT verify + refresh-on-expiry only. */
export function getMiddlewareAuthMode(): MiddlewareAuthMode {
  const mode = process.env.MIDDLEWARE_AUTH?.trim().toLowerCase();
  if (mode !== "local") return "network";

  if (!process.env.SUPABASE_JWT_SECRET) {
    console.warn(
      "[middleware] MIDDLEWARE_AUTH=local but SUPABASE_JWT_SECRET is unset — falling back to network"
    );
    return "network";
  }

  return "local";
}
