import { useQuery } from '@tanstack/react-query';
import { adminApi } from './adminApi';
import { vitalsApi } from './vitalsApi';

export function useAuditLogs(limit = 100) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', limit],
    queryFn: () => adminApi.listAuditLogs(limit),
    retry: 1,
  });
}

export function useChwProfiles() {
  return useQuery({
    queryKey: ['admin', 'chw-profiles'],
    queryFn: () => adminApi.listChwProfiles(),
    retry: 1,
  });
}

export function useVisitProofs() {
  return useQuery({
    queryKey: ['admin', 'visit-proofs'],
    queryFn: () => vitalsApi.getAdminVisitProofs(),
    retry: 1,
  });
}

export function useAdminSyncQueue() {
  return useQuery({
    queryKey: ['admin', 'sync-queue'],
    queryFn: () => vitalsApi.getAdminSyncQueue(),
    retry: 1,
  });
}

export function useDualZonePricing() {
  return useQuery({
    queryKey: ['admin', 'dual-zone-pricing'],
    queryFn: async () => {
      const zones = await adminApi.listPricingZones();
      const [zoneA, zoneB] = await Promise.all([
        adminApi.listPricingPlans('ZONE_A'),
        adminApi.listPricingPlans('ZONE_B'),
      ]);
      return { zones, zoneA, zoneB };
    },
    retry: 1,
  });
}

export function useAdminReviewQueue() {
  return useQuery({
    queryKey: ['admin', 'review-queue'],
    queryFn: () => vitalsApi.getReviewQueue(),
    retry: 1,
  });
}
