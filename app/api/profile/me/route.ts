import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/request-user";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const user = requireUserApi();
  if (user instanceof NextResponse) return user;

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("users")
    .select("display_name,email")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json(data ?? { display_name: "", email: user.email });
}
