import { assertAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { z } from "zod";

const addSchema = z.object({ email: z.string().email() });
const removeSchema = z.object({ userId: z.string().uuid() });

// GET /api/admin/players?email=xxx — generate a magic link without sending an email
export async function GET(req: Request) {
  await assertAdmin();
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://f1-fantasy-league-lilac.vercel.app";

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${appUrl}/auth/callback?next=/dashboard` }
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ link: data.properties.action_link });
}

export async function POST(req: Request) {
  await assertAdmin();
  const body = addSchema.parse(await req.json());
  const supabase = getSupabaseAdmin();

  // Try to create; if already exists, still return success so it's idempotent
  const { data, error } = await supabase.auth.admin.createUser({
    email: body.email,
    email_confirm: true,
    user_metadata: { display_name: body.email.split("@")[0] }
  });

  if (error) {
    // User already exists — look them up
    if ((error as { code?: string }).code === "email_exists" || error.message?.includes("already")) {
      const { data: listed } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = listed.users.find((u) => u.email?.toLowerCase() === body.email.toLowerCase());
      if (existing) {
        return NextResponse.json({ ok: true, userId: existing.id, email: existing.email, existed: true });
      }
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, userId: data.user.id, email: data.user.email });
}

export async function DELETE(req: Request) {
  await assertAdmin();
  const body = removeSchema.parse(await req.json());
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.auth.admin.deleteUser(body.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
