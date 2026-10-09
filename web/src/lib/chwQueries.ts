import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chwApi, type ChwVisit } from '@/lib/chwApi';

export function useChwPatients() {
  return useQuery({
    queryKey: ['chw', 'patients'],
    queryFn: () => chwApi.listPatients(),
    retry: 1,
  });
}

export function useChwVisits(status?: string) {
  return useQuery({
    queryKey: ['chw', 'visits', status ?? 'all'],
    queryFn: () => chwApi.listMyVisits(status),
    retry: 1,
  });
}

export function useAudioPrompts(language?: string) {
  return useQuery({
    queryKey: ['chw', 'audio-prompts', language ?? 'all'],
    queryFn: () => chwApi.listAudioPrompts(language),
    retry: 1,
  });
}

export function partitionChwVisits(visits: ChwVisit[]) {
  const scheduled = visits.filter(
    (v) => v.status === 'SCHEDULED' || v.status === 'ATTEMPTED',
  );
  const records = visits
    .filter((v) => v.status !== 'SCHEDULED')
    .slice()
    .sort(
      (a, b) =>
        new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime(),
    );
  const nextScheduled = scheduled
    .slice()
    .sort(
      (a, b) =>
        new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime(),
    )[0];
  const needsReview = visits.filter(
    (v) => v.status === 'NEEDS_REVIEW' || v.status === 'ESCALATED',
  ).length;
  const completed = visits.filter(
    (v) =>
      v.status === 'COMPLETED_VERIFIED' ||
      v.status === 'COMPLETED' ||
      v.status === 'PENDING_CONFIRMATION',
  ).length;

  return { scheduled, records, nextScheduled, needsReview, completed };
}

const DRAFT_KEY = 'myndora-chw-active-draft';

export function saveChwDraftFlag(visitId: string | null) {
  if (typeof sessionStorage === 'undefined') return;
  if (visitId) sessionStorage.setItem(DRAFT_KEY, visitId);
  else sessionStorage.removeItem(DRAFT_KEY);
}

export function readChwDraftFlag(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(DRAFT_KEY);
}

export function useChwVisitPartitions() {
  const visitsQuery = useChwVisits();
  const parts = useMemo(
    () => partitionChwVisits(visitsQuery.data ?? []),
    [visitsQuery.data],
  );
  return { visitsQuery, ...parts };
}
