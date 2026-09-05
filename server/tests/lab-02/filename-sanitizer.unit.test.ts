import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "../../src/filenameSanitizer.js";

describe("sanitizeFilename", () => {
  it("produces a filename with no path separators", () => {
    const result = sanitizeFilename("../../etc/passwd.pdf");
    expect(result).not.toMatch(/[/\\]/);
  });

  it("preserves the file extension", () => {
    expect(sanitizeFilename("report.pdf")).toMatch(/\.pdf$/);
    expect(sanitizeFilename("photo.PNG")).toMatch(/\.png$/);
  });

  it("produces unique filenames for repeated calls", () => {
    const a = sanitizeFilename("file.jpg");
    const b = sanitizeFilename("file.jpg");
    expect(a).not.toBe(b);
  });
});
