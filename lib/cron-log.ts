import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type CronJob = "sync-results" | "send-reminders" | "sync-calendar" | "recompute";

export async function startCronRun(job: CronJob): Promise<number | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("cron_runs")
    .insert({ job })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function endCronRun(
  id: number | null,
  status: "ok" | "error",
  opts: { error?: string; summary?: Record<string, unknown> } = {}
) {
  if (!id) return;
  const supabase = getSupabaseAdmin();
  await supabase
    .from("cron_runs")
    .update({
      finished_at: new Date().toISOString(),
      status,
      error: opts.error ?? null,
      summary: opts.summary ?? null
    })
    .eq("id", id);
}
