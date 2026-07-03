import { describe, expect, it } from "vitest";
import {
  isAdminApi,
  isProtectedApi,
  isProtectedPage,
  isProtectedUserApi
} from "./protected-routes";

describe("protected route helpers", () => {
  it("matches app pages", () => {
    expect(isProtectedPage("/dashboard")).toBe(true);
    expect(isProtectedPage("/picks")).toBe(true);
    expect(isProtectedPage("/admin/picks")).toBe(true);
    expect(isProtectedPage("/")).toBe(false);
    expect(isProtectedPage("/design")).toBe(false);
  });

  it("matches user APIs", () => {
    expect(isProtectedUserApi("/api/profile")).toBe(true);
    expect(isProtectedUserApi("/api/profile/me")).toBe(true);
    expect(isProtectedUserApi("/api/picks")).toBe(true);
    expect(isProtectedUserApi("/api/cron/send-reminders")).toBe(false);
  });

  it("matches admin APIs", () => {
    expect(isAdminApi("/api/admin/send-reminder-now")).toBe(true);
    expect(isAdminApi("/api/admin")).toBe(true);
    expect(isAdminApi("/api/administration")).toBe(false);
  });

  it("unions user and admin APIs", () => {
    expect(isProtectedApi("/api/picks")).toBe(true);
    expect(isProtectedApi("/api/admin/sync")).toBe(true);
    expect(isProtectedApi("/api/cron/recompute")).toBe(false);
  });
});
