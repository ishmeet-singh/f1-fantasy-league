type RequiredEnvName =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "OPENF1_BASE_URL"
  | "ADMIN_ALLOWLIST"
  | "RESEND_API_KEY";

export function requireEnv(name: RequiredEnvName) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}
