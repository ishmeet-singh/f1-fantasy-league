import { describe, expect, it, beforeEach } from "vitest";
import { isPerfLogEnabled, markRuntimeInvocation } from "./perf-investigate";

describe("perf-investigate", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete (globalThis as { __f1EdgeWarm?: boolean }).__f1EdgeWarm;
    delete (globalThis as { __f1NodeWarm?: boolean }).__f1NodeWarm;
  });

  it("is disabled unless PERF_LOG is set", () => {
    delete process.env.PERF_LOG;
    expect(isPerfLogEnabled()).toBe(false);
    process.env.PERF_LOG = "1";
    expect(isPerfLogEnabled()).toBe(true);
  });

  it("marks first node invocation as cold, second as warm", () => {
    const first = markRuntimeInvocation("nodejs");
    const second = markRuntimeInvocation("nodejs");
    expect(first.coldInstance).toBe(true);
    expect(second.coldInstance).toBe(false);
  });
});
