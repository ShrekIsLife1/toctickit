import { randomUUID } from "crypto";
import path from "path";

export function sanitizeFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();
  return `${randomUUID()}${ext}`;
}
