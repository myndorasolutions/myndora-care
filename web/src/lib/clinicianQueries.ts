import { useQuery } from '@tanstack/react-query';
import {
  isAwaitingClinicalReview,
  type FlaggedVitalReview,
} from './reviewQueue';
import { vitalsApi } from './vitalsApi';

export function useClinicianReviewQueue() {
  return useQuery({
    queryKey: ['admin', 'review-queue'],
    queryFn: () => vitalsApi.getReviewQueue(),
    retry: 1,
  });
}

export function partitionReviewQueue(rows: FlaggedVitalReview[]) {
  const awaiting = rows.filter(isAwaitingClinicalReview);
  const moreInfo = rows.filter((r) => r.status === 'reviewed');
  const urgent = awaiting.filter((r) => r.severity === 'URGENT');
  return { awaiting, moreInfo, urgent };
}
