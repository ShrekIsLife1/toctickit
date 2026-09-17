export function isSelfDeactivation(callerId: number, targetId: number, isActiveUpdate: boolean | undefined): boolean {
  return callerId === targetId && isActiveUpdate === false;
}

export function wouldRemoveLastActiveAdmin(
  targetId: number,
  targetIsCurrentlyActiveAdmin: boolean,
  activeAdminCount: number,
  update: { isActive?: boolean; role?: string }
): boolean {
  if (!targetIsCurrentlyActiveAdmin) return false;
  const losingActiveStatus = update.isActive === false;
  const losingAdminRole = update.role !== undefined && update.role !== "ADMINISTRATOR";
  if (!losingActiveStatus && !losingAdminRole) return false;
  return activeAdminCount <= 1;
}