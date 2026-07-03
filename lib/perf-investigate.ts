/**
 * Opt-in cold/warm investigation logging. No effect unless PERF_LOG=1.
 * View output in Vercel → Project → Logs (filter "perf-investigate").
 */

export type PerfRuntime = "edge" | "nodejs";

type PerfGlobals = {
  __f1EdgeWarm?: boolean;
  __f1NodeWarm?: boolean;
};

const g = globalThis as PerfGlobals;

export function isPerfLogEnabled(): boolean {
  const v = process.env.PERF_LOG?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function markRuntimeInvocation(runtime: PerfRuntime) {
  const warmKey = runtime === "edge" ? "__f1EdgeWarm" : "__f1NodeWarm";
  const coldInstance = !g[warmKey];
  g[warmKey] = true;
  return {
    runtime,
    coldInstance,
    ...(runtime === "nodejs"
      ? { processUptimeMs: Math.round(process.uptime() * 1000) }
      : {})
  };
}

export function perfLog(event: string, data: Record<string, unknown>) {
  if (!isPerfLogEnabled()) return;
  console.log(JSON.stringify({ tag: "perf-investigate", event, ...data }));
}

export async function timeAsync<T>(
  label: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>
): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  const result = await fn();
  const ms = Math.round(performance.now() - start);
  if (isPerfLogEnabled()) {
    perfLog("segment", { label, ms, ...meta });
  }
  return { result, ms };
}

export function attachPerfResponseHeaders(
  response: Response,
  values: Record<string, string | number | boolean>
) {
  if (!isPerfLogEnabled()) return;
  for (const [key, value] of Object.entries(values)) {
    response.headers.set(`x-perf-${key}`, String(value));
  }
}
