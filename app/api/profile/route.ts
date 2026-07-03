import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/request-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const user = requireUserApi();
  if (user instanceof NextResponse) return user;

  const { display_name } = await req.json();
  if (typeof display_name !== "string") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("users")
    .upsert({ id: user.id, email: user.email, display_name: display_name.trim() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
