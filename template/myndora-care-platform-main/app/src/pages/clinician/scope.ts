// Shared clinician scope helper.
// A clinician may only see patients whose care has been explicitly routed to them
// (via escalations, flagged results, or referrals). Billing, payouts and admin
// data never enter this scope.
import { useStore } from '@/store/useStore';

export function useClinicianScope() {
  const cases = useStore((s) => s.clinicianCases);
  const allPatients = useStore((s) => s.patients);
  const patientIds = [...new Set(cases.map((c) => c.patientId))];
  const patients = allPatients.filter((p) => patientIds.includes(p.id));
  const nameOf = (patientId: string) => allPatients.find((p) => p.id === patientId)?.name ?? 'Unknown patient';
  return { cases, patients, patientIds, nameOf };
}
