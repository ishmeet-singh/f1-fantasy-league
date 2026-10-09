import { NextResponse } from "next/server";

function acceptedCronSecrets(): string[] {
  return [process.env.CRON_SECRET, process.env.SUPABASE_CRON_SECRET].filter(
    (value): value is string => Boolean(value)
  );
}

export function assertCronAuthorized(request: Request) {
  const accepted = acceptedCronSecrets();
  if (!accepted.length) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const headerSecret = request.headers.get("x-cron-secret");
  const presented = bearer ?? headerSecret;

  if (presented && accepted.includes(presented)) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
