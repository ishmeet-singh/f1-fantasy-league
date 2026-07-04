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
});
