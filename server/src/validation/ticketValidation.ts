export interface CreateTicketInput {
  categoryId?: unknown;
  relatedSystemId?: unknown;
  summary?: unknown;
  description?: unknown;
  requestedPriority?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  fields: Record<string, string>;
}

const ALLOWED_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

export function validateCreateTicket(input: CreateTicketInput): ValidationResult {
  const fields: Record<string, string> = {};

  if (typeof input.summary !== "string" || input.summary.trim().length < 5 || input.summary.trim().length > 120) {
    fields.summary = "Summary must be 5-120 characters";
  }

  if (
    typeof input.description !== "string" ||
    input.description.trim().length < 10 ||
    input.description.trim().length > 2000
  ) {
    fields.description = "Description must be 10-2000 characters";
  }

  if (
    typeof input.requestedPriority !== "string" ||
    !ALLOWED_PRIORITIES.includes(input.requestedPriority)
  ) {
    fields.requestedPriority = "Requested priority must be LOW, MEDIUM, or HIGH";
  }

  if (typeof input.categoryId !== "number" || !Number.isInteger(input.categoryId)) {
    fields.categoryId = "A valid category is required";
  }

  if (typeof input.relatedSystemId !== "number" || !Number.isInteger(input.relatedSystemId)) {
    fields.relatedSystemId = "A valid related system is required";
  }

  return { valid: Object.keys(fields).length === 0, fields };
}