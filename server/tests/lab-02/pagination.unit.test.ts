import { describe, it, expect } from "vitest";
import { parsePagination, parseSort } from "../../src/queryParsing.js";

describe("parsePagination", () => {
  it("falls back to defaults when page/pageSize are missing", () => {
    expect(parsePagination({})).toEqual({ page: 1, pageSize: 10 });
  });

  it("falls back to defaults on invalid values", () => {
    expect(parsePagination({ page: "abc", pageSize: "xyz" })).toEqual({ page: 1, pageSize: 10 });
  });

  it("rejects out-of-range pageSize and falls back to default", () => {
    expect(parsePagination({ page: "2", pageSize: "500" })).toEqual({ page: 2, pageSize: 10 });
  });

  it("accepts valid values within range", () => {
    expect(parsePagination({ page: "3", pageSize: "25" })).toEqual({ page: 3, pageSize: 25 });
  });
});

describe("parseSort", () => {
  it("defaults to createdAt desc", () => {
    expect(parseSort({})).toEqual({ sortBy: "createdAt", sortDir: "desc" });
  });

  it("accepts a valid sortBy/sortDir combination", () => {
    expect(parseSort({ sortBy: "updatedAt", sortDir: "asc" })).toEqual({
      sortBy: "updatedAt",
      sortDir: "asc",
    });
  });

  it("falls back to defaults on an unknown sortBy", () => {
    expect(parseSort({ sortBy: "unknownField", sortDir: "asc" })).toEqual({
      sortBy: "createdAt",
      sortDir: "asc",
    });
  });
});
