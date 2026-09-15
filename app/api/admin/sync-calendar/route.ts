import { requireAdminApi } from "@/lib/admin";
import { syncCalendar } from "@/lib/sync";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = requireAdminApi();
  if (auth instanceof NextResponse) return auth;
  try {
    await syncCalendar();
    revalidateTag("race-weekends");
    revalidateTag("drivers");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin calendar sync error:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
