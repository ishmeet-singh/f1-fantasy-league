import { NextResponse } from "next/server";

function getCronSecret() {
  return process.env.CRON_SECRET;
}

export function assertCronAuthorized(request: Request) {
  const expected = getCronSecret();
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const headerSecret = request.headers.get("x-cron-secret");

  if (bearer === expected || headerSecret === expected) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
