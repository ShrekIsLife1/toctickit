import { describe, it, expect } from "vitest";
import { isSelfDeactivation, wouldRemoveLastActiveAdmin } from "../../src/adminUserRules.js";

describe("isSelfDeactivation", () => {
  it("detects an admin trying to deactivate themselves", () => {
    expect(isSelfDeactivation(5, 5, false)).toBe(true);
  });

  it("allows deactivating someone else", () => {
    expect(isSelfDeactivation(5, 6, false)).toBe(false);
  });

  it("allows editing your own account without deactivating", () => {
    expect(isSelfDeactivation(5, 5, true)).toBe(false);
    expect(isSelfDeactivation(5, 5, undefined)).toBe(false);
  });
});

describe("wouldRemoveLastActiveAdmin", () => {
  it("blocks deactivating the last active admin", () => {
    expect(wouldRemoveLastActiveAdmin(1, true, 1, { isActive: false })).toBe(true);
  });

  it("blocks demoting the last active admin", () => {
    expect(wouldRemoveLastActiveAdmin(1, true, 1, { role: "IT_STAFF" })).toBe(true);
  });

  it("allows deactivating an admin when others remain active", () => {
    expect(wouldRemoveLastActiveAdmin(1, true, 2, { isActive: false })).toBe(false);
  });

  it("allows editing a non-admin user regardless of admin count", () => {
    expect(wouldRemoveLastActiveAdmin(1, false, 1, { isActive: false })).toBe(false);
  });

  it("allows an unrelated update (e.g. name change) on the last admin", () => {
    expect(wouldRemoveLastActiveAdmin(1, true, 1, {})).toBe(false);
  });
});