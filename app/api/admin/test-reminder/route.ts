import { assertAdmin } from "@/lib/admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendReminderEmail } from "@/lib/email";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/test-reminder
 * Sends a test reminder email to the calling admin immediately.
 * Use this to verify Resend API key + email delivery works.
 */
export async function POST() {
  const adminUser = await assertAdmin();

  const checks: Record<string, string> = {};

  // Check 1: GMAIL_USER
  checks.GMAIL_USER = process.env.GMAIL_USER
    ? `set (${process.env.GMAIL_USER})`
    : "MISSING ❌";

  // Check 2: GMAIL_APP_PASSWORD
  checks.GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD ? "set ✓" : "MISSING ❌";

  // Check 3: NEXT_PUBLIC_APP_URL
  checks.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "not set (using hardcoded fallback)";

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({
      ok: false,
      error: "GMAIL_USER or GMAIL_APP_PASSWORD is not set in Vercel environment variables",
      checks
    }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://f1-fantasy-league-lilac.vercel.app";

  // Generate a magic link for the admin (test email is always urgent / <=60min)
  let picksLink = `${appUrl}/picks`;
  let isMagicLink = false;
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: adminUser.email!,
    options: { redirectTo: `${appUrl}/auth/callback?next=/picks` }
  });

  if (linkError || !linkData?.properties?.action_link) {
    checks.magicLinkGenerated = `failed: ${linkError?.message ?? "no action_link"}`;
  } else {
    picksLink = linkData.properties.action_link;
    isMagicLink = true;
    checks.magicLinkGenerated = "✓ success";
  }

  // Try sending the email
  try {
    await sendReminderEmail({
      to: adminUser.email!,
      name: adminUser.email!.split("@")[0],
      raceName: "Australian Grand Prix (test)",
      eventType: "race",
      minutesLeft: 60,
      picksLink,
      isMagicLink
    });

    return NextResponse.json({
      ok: true,
      message: `Test reminder sent to ${adminUser.email}`,
      checks
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      checks
    }, { status: 500 });
  }
}
