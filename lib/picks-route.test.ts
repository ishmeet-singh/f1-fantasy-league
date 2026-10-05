import { beforeEach, describe, expect, it, vi } from "vitest";

const savePicks = vi.fn();

vi.mock("@/lib/save-picks", () => ({ savePicks }));
vi.mock("@/lib/request-user", () => ({
  requireUserApi: () => ({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", email: "player@example.com" })
}));

const { POST } = await import("@/app/api/picks/route");

function request(body: string) {
  return new Request("http://localhost/api/picks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body
  });
}

beforeEach(() => {
  savePicks.mockReset();
});

describe("POST /api/picks", () => {
  it("returns a readable 400 for a malformed body instead of crashing", async () => {
    const res = await POST(request("not json"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Invalid picks request — refresh the page and try again"
    });
    expect(savePicks).not.toHaveBeenCalled();
  });

  it("returns a readable 400 for an invalid session type", async () => {
    const res = await POST(request(JSON.stringify({ raceId: "1308", eventType: "fp1", picks: {} })));

    expect(res.status).toBe(400);
    expect(savePicks).not.toHaveBeenCalled();
  });

  it("surfaces save errors to the client", async () => {
    savePicks.mockResolvedValue({ error: "Locked — session has started" });

    const res = await POST(
      request(JSON.stringify({ raceId: "1308", eventType: "quali", picks: { "1": "4" } }))
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Locked — session has started" });
  });

  it("returns ok when picks are saved", async () => {
    savePicks.mockResolvedValue({ ok: true });

    const res = await POST(
      request(JSON.stringify({ raceId: "1308", eventType: "quali", picks: { "1": "4", "2": "1", "3": "16" } }))
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
