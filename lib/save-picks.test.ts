import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const recomputeRaceScores = vi.fn();
let tableData: Record<string, unknown>;

function queryBuilder(table: string) {
  const result = { data: tableData[table] ?? null, error: null };
  const builder: Record<string, unknown> = {
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve)
  };
  for (const method of ["select", "eq", "limit", "upsert"]) {
    builder[method] = () => builder;
  }
  builder.single = () => Promise.resolve(result);
  builder.maybeSingle = () => Promise.resolve(result);
  return builder;
}

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: queryBuilder, rpc })
}));
vi.mock("@/lib/recompute", () => ({ recomputeRaceScores }));

const { savePicks } = await import("./save-picks");

const USER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const HOUR = 60 * 60 * 1000;

function openRace(deadlineFromNowMs = 2 * HOUR) {
  const deadline = new Date(Date.now() + deadlineFromNowMs).toISOString();
  return { quali_start: deadline, sprint_start: null, race_start: deadline, has_sprint: false };
}

beforeEach(() => {
  rpc.mockReset();
  recomputeRaceScores.mockReset();
  tableData = {
    race_weekends: openRace(),
    results: null,
    race_entries: [{ driver_id: "1" }, { driver_id: "4" }, { driver_id: "16" }, { driver_id: "44" }]
  };
});

describe("savePicks", () => {
  it("saves all picks in one atomic rpc call", async () => {
    rpc.mockResolvedValue({ data: 3, error: null });

    const result = await savePicks({
      userId: USER,
      raceId: "1308",
      eventType: "quali",
      picks: { "1": "4", "2": "1", "3": "16" }
    });

    expect(result).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("save_predictions", {
      p_user_id: USER,
      p_race_id: "1308",
      p_event_type: "quali",
      p_picks: [
        { driver_id: "4", predicted_position: 1 },
        { driver_id: "1", predicted_position: 2 },
        { driver_id: "16", predicted_position: 3 }
      ],
      p_created_at: null
    });
  });

  it("reports database errors instead of claiming success", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "insert failed" } });

    const result = await savePicks({
      userId: USER,
      raceId: "1308",
      eventType: "quali",
      picks: { "1": "4", "2": "1", "3": "16" }
    });

    expect(result).toEqual({ error: "insert failed" });
  });

  it("reports a partial write as an error", async () => {
    rpc.mockResolvedValue({ data: 2, error: null });

    const result = await savePicks({
      userId: USER,
      raceId: "1308",
      eventType: "quali",
      picks: { "1": "4", "2": "1", "3": "16" }
    });

    expect(result).toEqual({ error: "Saved 2 of 3 picks — please try again" });
  });

  it("rejects duplicate drivers without touching saved picks", async () => {
    const result = await savePicks({
      userId: USER,
      raceId: "1308",
      eventType: "quali",
      picks: { "1": "4", "2": "4", "3": "16" }
    });

    expect(result).toEqual({ error: "Duplicate drivers not allowed" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects saves after the session has started", async () => {
    tableData.race_weekends = openRace(-HOUR);

    const result = await savePicks({
      userId: USER,
      raceId: "1308",
      eventType: "quali",
      picks: { "1": "4", "2": "1", "3": "16" }
    });

    expect(result).toEqual({ error: "Locked — session has started" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes the admin backfill timestamp through and recomputes", async () => {
    tableData.race_weekends = openRace(-HOUR);
    rpc.mockResolvedValue({ data: 3, error: null });
    recomputeRaceScores.mockResolvedValue({ errors: [] });

    const result = await savePicks({
      userId: USER,
      raceId: "1308",
      eventType: "quali",
      picks: { "1": "4", "2": "1", "3": "16" },
      skipLockCheck: true,
      createdAt: "2026-10-01T10:00:00Z"
    });

    expect(result).toEqual({ ok: true });
    expect(rpc.mock.calls[0][1].p_created_at).toBe("2026-10-01T10:00:00Z");
    expect(recomputeRaceScores).toHaveBeenCalledWith("1308");
  });
});
