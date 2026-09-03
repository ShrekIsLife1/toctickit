export function formatTicketNumber(sequence: number, year: number = new Date().getFullYear()): string {
  return `TKT-${year}-${String(sequence).padStart(6, "0")}`;
}