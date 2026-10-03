import { describe, it, expect } from "vitest";
import { isValidTransition, getPermittedTransitions } from "../../src/statusTransitions.js";

describe("isValidTransition", () => {
  it("allows New to Open", () => {
    expect(isValidTransition("NEW", "OPEN")).toBe(true);
  });

  it("rejects Open directly to Closed", () => {
    expect(isValidTransition("OPEN", "CLOSED")).toBe(false);
  });

  it("allows Resolved to Closed", () => {
    expect(isValidTransition("RESOLVED", "CLOSED")).toBe(true);
  });

  it("allows Resolved to Reopened", () => {
    expect(isValidTransition("RESOLVED", "REOPENED")).toBe(true);
  });

  it("allows Closed to Reopened", () => {
    expect(isValidTransition("CLOSED", "REOPENED")).toBe(true);
  });

  it("rejects Cancelled to anything (terminal)", () => {
    expect(isValidTransition("CANCELLED", "OPEN")).toBe(false);
    expect(isValidTransition("CANCELLED", "REOPENED")).toBe(false);
  });

  it("rejects a status to itself", () => {
    expect(isValidTransition("OPEN", "OPEN")).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(isValidTransition("BOGUS", "OPEN")).toBe(false);
  });
});

describe("getPermittedTransitions", () => {
  it("returns the correct next statuses for In Progress", () => {
    expect(getPermittedTransitions("IN_PROGRESS")).toEqual(["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]);
  });

  it("returns an empty array for a terminal status", () => {
    expect(getPermittedTransitions("CANCELLED")).toEqual([]);
  });
});