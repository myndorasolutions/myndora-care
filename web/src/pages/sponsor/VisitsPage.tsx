import { Badge, Card, EmptyState, KV, PageHeader, Select } from '@/components/kit';
import {
  useSponsorSelectedPatient,
  useSponsorVisits,
} from '@/lib/sponsorQueries';

export function SponsorVisitsPage() {
  const {
    patients,
    selectedPatient,
    selectedPatientId,
    setSelectedPatientId,
    patientsQuery,
  } = useSponsorSelectedPatient();
  const visitsQuery = useSponsorVisits(selectedPatientId);
  const visits = visitsQuery.data ?? [];

  return (
    <div>
      <PageHeader
        title="Visits"
        subtitle={
          selectedPatient
            ? `Visit history for ${selectedPatient.fullName}`
            : 'Physical CHW visit history'
        }
        actions={
          patients.length > 1 ? (
            <Select
              value={selectedPatientId ?? ''}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              aria-label="Select patient"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </Select>
          ) : undefined
        }
      />

      {patientsQuery.isLoading || visitsQuery.isLoading ? (
        <p className="text-sm text-slate-500">Loading visits…</p>
      ) : !selectedPatient ? (
        <Card>
          <EmptyState title="No patient selected" hint="Add a patient to see visits." />
        </Card>
      ) : visits.length === 0 ? (
        <Card>
          <EmptyState
            title="No visits yet"
            hint="Completed CHW visits for this patient will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {visits.map((v) => (
            <Card key={v.id}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">{v.patient_name}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(v.visit_date).toLocaleString('en-NG')}
                  </p>
                </div>
                <Badge tone="green">Completed</Badge>
              </div>
              <KV label="CHW">{v.chw_name}</KV>
              <KV label="Verification">
                <Badge tone="blue">{v.verification_method}</Badge>
              </KV>
            </Card>
          ))}
        </div>
      )}

      {visitsQuery.isError && (
        <p className="mt-3 text-sm text-amber-800">Could not load visit history.</p>
      )}
    </div>
  );
}
