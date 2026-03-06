import { getSupabaseAdmin } from "@/lib/supabase-admin";

type LocalUser = {
  id: string;
  email: string;
};

function configuredEmail() {
  const first = (process.env.ADMIN_ALLOWLIST || "")
    .split(",")
    .map((v) => v.trim())
    .find(Boolean);
  return first || "local-user@f1league.app";
}

function defaultDisplayName(email: string) {
  return email.split("@")[0] || "Player";
}

export async function ensureLocalUser(): Promise<LocalUser> {
  const supabase = getSupabaseAdmin();
  const email = configuredEmail();

  const { data: existing } = await supabase.from("users").select("id,email").eq("email", email).maybeSingle();
  if (existing) return { id: existing.id, email: existing.email };

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { display_name: defaultDisplayName(email) }
  });

  if (createError) {
    if ((createError as { code?: string }).code === "email_exists") {
      const { data: listed } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const matched = listed.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
      if (matched?.id) {
        await supabase.from("users").upsert({
          id: matched.id,
          email: matched.email || email,
          display_name: defaultDisplayName(matched.email || email)
        });
        return { id: matched.id, email: matched.email || email };
      }
    }

    const { data: afterError } = await supabase.from("users").select("id,email").eq("email", email).maybeSingle();
    if (afterError) return { id: afterError.id, email: afterError.email };
    throw createError;
  }

  const id = created.user?.id;
  if (!id) throw new Error("Failed to initialize local user");

  await supabase.from("users").upsert({
    id,
    email,
    display_name: defaultDisplayName(email)
  });

  return { id, email };
}
