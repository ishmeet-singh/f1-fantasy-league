import { describe, expect, it } from "vitest";
import { usersWithCompletePicks } from "./reminder-submission";

describe("usersWithCompletePicks", () => {
  const userA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const userB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

  it("requires 10 rows for sprint", () => {
    const rows = Array.from({ length: 10 }, () => ({ user_id: userA }));
    expect(usersWithCompletePicks(rows, "sprint").has(userA)).toBe(true);
  });

  it("does not count partial sprint picks", () => {
    const rows = Array.from({ length: 9 }, () => ({ user_id: userA }));
    expect(usersWithCompletePicks(rows, "sprint").has(userA)).toBe(false);
  });

  it("requires 3 rows for quali", () => {
    const rows = [
      { user_id: userA },
      { user_id: userA },
      { user_id: userA },
      { user_id: userB }
    ];
    const complete = usersWithCompletePicks(rows, "quali");
    expect(complete.has(userA)).toBe(true);
    expect(complete.has(userB)).toBe(false);
  });

  it("treats a withdrawn-driver pick as incomplete", () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      user_id: userA,
      driver_id: String(index + 1)
    }));
    const eligible = new Set(Array.from({ length: 10 }, (_, index) => String(index + 2)));

    expect(usersWithCompletePicks(rows, "race", eligible).has(userA)).toBe(false);
  });
});
