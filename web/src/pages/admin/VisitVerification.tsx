import { Badge, Card, EmptyState, PageHeader } from '@/components/kit';
import { ApiError } from '@/lib/api';
import { useAdminSyncQueue, useVisitProofs } from '@/lib/adminQueries';

function EvidenceBadge({ ok, label }: { ok: boolean; label: string }) {
  return <Badge tone={ok ? 'green' : 'red'}>{label}</Badge>;
}

export function AdminVisitVerificationPage() {
  const proofsQuery = useVisitProofs();
  const syncQuery = useAdminSyncQueue();
  const proofs = proofsQuery.data ?? [];
  const sync = syncQuery.data ?? [];

  const errorMsg =
    proofsQuery.error instanceof ApiError
      ? proofsQuery.error.message
      : proofsQuery.isError
        ? 'Could not load visit proofs.'
        : null;

  return (
    <div>
      <PageHeader
        title="Visit verification"
        subtitle="Evidence trail behind every visit — OTP, signature attestation, and completion status."
      />

      {errorMsg && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{errorMsg}</p>
        </Card>
      )}

      {sync.length > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50/40">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-amber-700">
            Sync queue ({sync.length})
          </p>
          <div className="space-y-2">
            {sync.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {f.patient_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {f.status} · {new Date(f.recorded_at).toLocaleString()}
                  </p>
                </div>
                <Badge tone="amber">Awaiting completion</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {proofsQuery.isLoading ? (
        <Card>
          <p className="text-sm text-slate-500">Loading visit proofs…</p>
        </Card>
      ) : proofs.length === 0 ? (
        <Card>
          <EmptyState
            title="No visit proofs yet"
            hint="Completed and in-progress field visits appear here."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {proofs.map((v) => (
            <Card key={v.id}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900">{v.patient_name}</h3>
                  <p className="text-xs text-slate-500">
                    CHW {v.chw_name} · {new Date(v.visit_date).toLocaleString()}
                  </p>
                </div>
                <Badge
                  tone={v.proof_status === 'confirmed' ? 'green' : 'amber'}
                >
                  {v.proof_status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <EvidenceBadge
                  ok={v.otp_state === 'confirmed' || v.otp_state === 'n/a'}
                  label={`OTP: ${v.otp_state}`}
                />
                <EvidenceBadge
                  ok={
                    v.signature_state === 'captured' ||
                    v.signature_state === 'n/a'
                  }
                  label={`Signature: ${v.signature_state}`}
                />
                <Badge tone="blue">{v.verification_method}</Badge>
                <Badge tone="gray">{v.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                BP {v.systolic_bp}/{v.diastolic_bp}
                {v.pulse != null ? ` · pulse ${v.pulse}` : ''}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
