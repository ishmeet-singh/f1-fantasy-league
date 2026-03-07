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

  // Check 1: RESEND_API_KEY
  checks.RESEND_API_KEY = process.env.RESEND_API_KEY
    ? `set (starts with ${process.env.RESEND_API_KEY.slice(0, 6)}...)`
    : "MISSING ❌";

  // Check 2: EMAIL_FROM
  checks.EMAIL_FROM = process.env.EMAIL_FROM || "not set (using fallback noreply@resend.dev)";

  // Check 3: NEXT_PUBLIC_APP_URL
  checks.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "not set (using hardcoded fallback)";

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({
      ok: false,
      error: "RESEND_API_KEY is not set in Vercel environment variables",
      checks
    }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://f1-fantasy-league-lilac.vercel.app";

  // Generate a real magic link for the admin
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: adminUser.email!,
    options: { redirectTo: `${appUrl}/auth/callback?next=/picks` }
  });

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json({
      ok: false,
      error: `Magic link generation failed: ${linkError?.message}`,
      checks
    }, { status: 500 });
  }

  checks.magicLinkGenerated = "✓ success";

  // Try sending the email
  try {
    await sendReminderEmail({
      to: adminUser.email!,
      name: adminUser.email!.split("@")[0],
      raceName: "Australian Grand Prix (test)",
      eventType: "race",
      minutesLeft: 60,
      magicLink: linkData.properties.action_link
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
