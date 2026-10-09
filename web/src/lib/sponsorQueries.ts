import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PRICING_TIERS, type SubscriptionPlanId } from '@/lib/pilotData';
import { sponsorApi } from '@/lib/sponsorApi';
import { reviewQueueToAlerts, vitalsApi } from '@/lib/vitalsApi';

export function planDisplayName(planName: string): string {
  const tier = PRICING_TIERS.find((t) => t.id === (planName as SubscriptionPlanId));
  return tier?.name ?? planName.replace(/_/g, ' ');
}

export function useSponsorOnboarding() {
  return useQuery({
    queryKey: ['sponsor', 'onboarding'],
    queryFn: () => sponsorApi.getOnboarding(),
  });
}

export function useSponsorPatients() {
  return useQuery({
    queryKey: ['sponsor', 'patients'],
    queryFn: () => vitalsApi.listMyPatients(),
  });
}

export function useSponsorSelectedPatient() {
  const [searchParams, setSearchParams] = useSearchParams();
  const patientsQuery = useSponsorPatients();
  const patients = patientsQuery.data ?? [];

  const patientIdFromUrl = searchParams.get('patientId');
  const selected =
    patients.find((p) => p.id === patientIdFromUrl) ?? patients[0] ?? null;

  const setSelectedPatientId = (id: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('patientId', id);
        return next;
      },
      { replace: true },
    );
  };

  return {
    patientsQuery,
    patients,
    selectedPatient: selected,
    selectedPatientId: selected?.id ?? null,
    setSelectedPatientId,
  };
}

export function useSponsorVitals(patientId: string | null, days = 14) {
  return useQuery({
    queryKey: ['sponsor', 'vitals', patientId, days],
    queryFn: () => vitalsApi.getTrend(patientId!, days),
    enabled: Boolean(patientId),
  });
}

export function useSponsorVisits(patientId: string | null) {
  return useQuery({
    queryKey: ['sponsor', 'visits', patientId],
    queryFn: () => vitalsApi.getVisitHistory(patientId!),
    enabled: Boolean(patientId),
  });
}

export function useSponsorAlerts() {
  const query = useQuery({
    queryKey: ['sponsor', 'alerts'],
    queryFn: () => vitalsApi.getSponsorAlerts(),
  });
  const alerts = useMemo(
    () => reviewQueueToAlerts(query.data ?? []),
    [query.data],
  );
  return { ...query, alerts };
}
