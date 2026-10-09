import { ChwActivationLevel } from '@prisma/client';

const ACTIVATION_RANK: Record<ChwActivationLevel, number> = {
  [ChwActivationLevel.SUSPENDED]: -1,
  [ChwActivationLevel.PENDING_REVIEW]: 0,
  [ChwActivationLevel.IDENTITY_VERIFIED]: 1,
  [ChwActivationLevel.REMOTE_CHECK_APPROVED]: 2,
  [ChwActivationLevel.HOME_VISIT_APPROVED]: 3,
  [ChwActivationLevel.SENIOR_FIELD_LEAD]: 4,
};

export function meetsActivationLevel(
  current: ChwActivationLevel,
  required: ChwActivationLevel,
): boolean {
  if (current === ChwActivationLevel.SUSPENDED) {
    return false;
  }
  return ACTIVATION_RANK[current] >= ACTIVATION_RANK[required];
}
