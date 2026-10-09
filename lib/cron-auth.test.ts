import { afterEach, describe, expect, it } from "vitest";
import { assertCronAuthorized } from "./cron-auth";

const originalCronSecret = process.env.CRON_SECRET;
const originalSupabaseCronSecret = process.env.SUPABASE_CRON_SECRET;

afterEach(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;
  if (originalSupabaseCronSecret === undefined) delete process.env.SUPABASE_CRON_SECRET;
  else process.env.SUPABASE_CRON_SECRET = originalSupabaseCronSecret;
});

function requestWithBearer(token: string) {
  return new Request("https://app.test/api/cron/send-reminders", {
    headers: { authorization: `Bearer ${token}` }
  });
}

describe("assertCronAuthorized", () => {
  it("accepts either the GitHub cron secret or the Supabase scheduler secret", () => {
    process.env.CRON_SECRET = "github-secret";
    process.env.SUPABASE_CRON_SECRET = "supabase-secret";

    expect(assertCronAuthorized(requestWithBearer("github-secret"))).toBeNull();
    expect(assertCronAuthorized(requestWithBearer("supabase-secret"))).toBeNull();
    expect(assertCronAuthorized(requestWithBearer("other"))?.status).toBe(401);
  });
});
