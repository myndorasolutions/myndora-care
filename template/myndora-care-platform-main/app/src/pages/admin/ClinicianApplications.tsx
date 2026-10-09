// Admin Clinician Applications: review expressions of interest and verification
// submissions from clinicians. Approval activates the clinician profile only when
// the applicant holds an account; there is no public self-registration as an
// approved clinician.
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/store/ui';
import { Badge, Btn, Card, EmptyState, KV, PageHeader } from '@/components/kit';

type ClinicianApplication = {
  id: number; name: string; email: string;
  stage: 'invited' | 'application_submitted' | 'verification_pending' | 'approved' | 'suspended' | 'rejected';
  payload: Record<string, unknown>;
  hasAccount: boolean; updatedAt: string | Date;
};

const STAGE_TONE: Record<ClinicianApplication['stage'], 'green' | 'amber' | 'red' | 'blue' | 'gray'> = {
  invited: 'gray', application_submitted: 'blue', verification_pending: 'amber',
  approved: 'green', suspended: 'amber', rejected: 'red',
};

const STAGE_LABEL: Record<ClinicianApplication['stage'], string> = {
  invited: 'Invited', application_submitted: 'Application submitted', verification_pending: 'Verification pending',
  approved: 'Approved', suspended: 'Suspended', rejected: 'Rejected',
};

const PAYLOAD_FIELDS: { key: string; label: string }[] = [
  { key: 'legalName', label: 'Legal name' },
  { key: 'category', label: 'Professional category' },
  { key: 'registrationNumber', label: 'Registration number' },
  { key: 'licensingAuthority', label: 'Licensing authority' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'speciality', label: 'Speciality' },
  { key: 'experienceYears', label: 'Experience' },
  { key: 'facility', label: 'Facility / affiliation' },
  { key: 'phone', label: 'Phone' },
  { key: 'documents', label: 'Documents' },
];

export default function AdminClinicianApplications() {
  const { toast } = useToast();
  const [apps, setApps] = useState<ClinicianApplication[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setApps(await api.admin.clinicianApplications.query() as ClinicianApplication[]);
    } catch {
      setApps([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (id: number, stage: 'verification_pending' | 'approved' | 'suspended' | 'rejected') => {
    setBusy(id);
    try {
      await api.admin.reviewClinicianApplication.mutate({ id, stage });
      await load();
      toast(`Application marked ${STAGE_LABEL[stage].toLowerCase()}`);
    } catch {
      toast('Could not update the application');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Clinician Applications"
        subtitle="Expressions of interest and verification submissions from clinicians. Approval activates the clinician profile only for applicants who hold an account — clinicians can never self-register as approved."
      />
      {apps === null ? (
        <Card><p className="text-sm text-slate-500">Loading applications…</p></Card>
      ) : apps.length === 0 ? (
        <Card><EmptyState title="No clinician applications" hint="Applications submitted through the clinician EOI form appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <p className="text-base font-extrabold text-slate-900">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.email} · updated {new Date(a.updatedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="flex gap-1.5">
                  <Badge tone={STAGE_TONE[a.stage]}>{STAGE_LABEL[a.stage]}</Badge>
                  {a.hasAccount ? <Badge tone="blue">has account</Badge> : <Badge tone="gray">no account yet</Badge>}
                </div>
              </div>
              <div className="grid gap-x-6 sm:grid-cols-2 mb-3">
                {PAYLOAD_FIELDS.filter((f) => a.payload[f.key]).map((f) => (
                  <KV key={f.key} label={f.label}>{String(a.payload[f.key])}</KV>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {a.stage === 'application_submitted' && (
                  <Btn size="sm" variant="secondary" disabled={busy === a.id} onClick={() => review(a.id, 'verification_pending')}>Start verification</Btn>
                )}
                {(a.stage === 'application_submitted' || a.stage === 'verification_pending') && (
                  <>
                    <Btn size="sm" disabled={busy === a.id} onClick={() => review(a.id, 'approved')}>Approve</Btn>
                    <Btn size="sm" variant="danger" disabled={busy === a.id} onClick={() => review(a.id, 'rejected')}>Reject</Btn>
                  </>
                )}
                {a.stage === 'approved' && (
                  <Btn size="sm" variant="danger-soft" disabled={busy === a.id} onClick={() => review(a.id, 'suspended')}>Suspend</Btn>
                )}
                {a.stage === 'suspended' && (
                  <Btn size="sm" variant="secondary" disabled={busy === a.id} onClick={() => review(a.id, 'approved')}>Reinstate</Btn>
                )}
              </div>
              {!a.hasAccount && a.stage !== 'rejected' && (
                <p className="text-xs text-slate-400 mt-2">
                  The applicant has not created an account yet — approval is recorded, and the clinician profile is
                  activated when they sign in with this email.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
