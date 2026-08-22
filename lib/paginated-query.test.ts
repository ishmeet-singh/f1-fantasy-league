import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "./paginated-query";

describe("fetchAllPages", () => {
  it("loads datasets larger than Supabase's 1,000-row response limit", async () => {
    const source = Array.from({ length: 1051 }, (_, id) => ({ id }));
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: source.slice(from, to + 1),
      error: null
    }));

    const rows = await fetchAllPages("predictions", fetchPage, 500);

    expect(rows).toHaveLength(1051);
    expect(rows.at(-1)).toEqual({ id: 1050 });
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("throws instead of treating a failed page as an empty result", async () => {
    await expect(
      fetchAllPages("results", async () => ({
        data: null,
        error: { message: "database unavailable" }
      }))
    ).rejects.toThrow("results: database unavailable");
  });
});
