export interface ResolutionGateInput {
  ticketOwnerId: number | null | undefined;
  actionsCount: number;
}

export function validateResolutionGate(input: ResolutionGateInput): {
  isMet: boolean;
  missingCriteria: string[];
} {
  const missingCriteria: string[] = [];
  if (!input.ticketOwnerId) {
    missingCriteria.push("Ticket must have an assigned owner");
  }
  if (input.actionsCount <= 0) {
    missingCriteria.push("Ticket must have at least one Action Taken recorded");
  }
  return {
    isMet: missingCriteria.length === 0,
    missingCriteria,
  };
}
