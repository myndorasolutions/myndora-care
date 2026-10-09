// Admin CHW Applications: review every application and move it through the
// verification pipeline — humans approve, stage by stage.
import { useCallback, useEffect, useState } from 'react';
import type { ChwApplicationStage, ChwApplicationSummary } from '@contracts/types';
import { CHW_STAGE_LABELS } from '@contracts/types';
import { api } from '@/lib/api';
import { useToast } from '@/store/ui';
import { Badge, Btn, Card, EmptyState, PageHeader } from '@/components/kit';

const NEXT: Partial<Record<ChwApplicationStage, Exclude<ChwApplicationStage, 'application_started'>>> = {
  application_started: 'identity_review',
  identity_review: 'qualification_review',
  qualification_review: 'references_pending',
  references_pending: 'training_required',
  training_required: 'approved_remote',
  approved_remote: 'approved_home_visits',
};

const STAGE_TONE: Record<ChwApplicationStage, 'amber' | 'blue' | 'green' | 'red' | 'gray'> = {
  application_started: 'gray', identity_review: 'amber', qualification_review: 'amber',
  references_pending: 'amber', training_required: 'blue', approved_remote: 'green',
  approved_home_visits: 'green', suspended: 'red', rejected: 'red',
};

const ORDER: ChwApplicationStage[] = ['application_started', 'identity_review', 'qualification_review', 'references_pending', 'training_required', 'approved_remote', 'approved_home_visits'];

export default function AdminChwApplications() {
  const { toast } = useToast();
  const [apps, setApps] = useState<ChwApplicationSummary[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setApps(await api.admin.chwApplications.query());
      setError('');
    } catch {
      setError('Could not load applications from the server.');
      setApps([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      // Ensure at least the sample walk-in application exists for UAT, then load.
      try { await api.admin.seedDemoChwApplication.mutate(); } catch { /* non-fatal */ }
      await load();
    })();
  }, [load]);

  const advance = async (id: number, stage: Exclude<ChwApplicationStage, 'application_started'>) => {
    setBusy(id);
    try {
      await api.admin.advanceChwApplication.mutate({ id, stage });
      await load();
      toast(`Application moved to “${CHW_STAGE_LABELS[stage]}”`);
    } catch {
      toast('Could not update the application');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title="CHW Applications" subtitle="Every applicant passes identity, qualification, reference and training stages before activation. Remote-check approval and home-visit approval are separate decisions." />
      {error && <p className="text-sm text-red-600 mb-3" role="alert">{error}</p>}
      {apps === null ? (
        <Card><p className="text-sm text-slate-500">Loading applications…</p></Card>
      ) : apps.length === 0 ? (
        <Card><EmptyState title="No applications yet" hint="New CHW applications appear here as they are submitted." /></Card>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => {
            const next = NEXT[a.stage];
            const payload = a.payload as Record<string, unknown>;
            const refs = (payload.references as { name: string; phone: string }[] | undefined) ?? [];
            return (
              <Card key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-extrabold text-slate-900">{a.applicantName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{a.city} · updated {new Date(a.updatedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} · {a.hasAccount ? 'registered account' : 'walk-in application'}</p>
                  </div>
                  <Badge tone={STAGE_TONE[a.stage]}>{CHW_STAGE_LABELS[a.stage]}</Badge>
                </div>

                <div className="flex items-center gap-1 mt-3" aria-label="Application progress">
                  {ORDER.map((s, i) => (
                    <span key={s} className="h-1.5 flex-1 rounded-full" title={CHW_STAGE_LABELS[s]}
                      style={{ background: ORDER.indexOf(a.stage) >= i ? 'var(--accent, var(--blue))' : '#e2e8f0' }} />
                  ))}
                </div>

                {expanded === a.id && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                    <p><b>Phone:</b> {String(payload.phone ?? '—')}</p>
                    <p><b>NIN:</b> {payload.nin ? '••••••' + String(payload.nin).slice(-4) : '—'}</p>
                    <p><b>Cadre:</b> {String(payload.cadre ?? '—')}</p>
                    <p><b>Qualification:</b> {String(payload.qualification ?? '—')}</p>
                    <p><b>Registration:</b> {String(payload.registration ?? '—')}</p>
                    <p><b>Experience:</b> {String(payload.yearsExperience ?? '—')} years</p>
                    <p><b>Languages:</b> {(payload.languages as string[] | undefined)?.join(', ') ?? '—'}</p>
                    <p><b>Service area:</b> {String(payload.serviceArea ?? '—')} ({String(payload.radiusKm ?? '—')} km)</p>
                    <p className="sm:col-span-2"><b>Requested services:</b> {(payload.requestedServices as string[] | undefined)?.join(', ') ?? '—'}</p>
                    <p className="sm:col-span-2"><b>References:</b> {refs.map((r) => `${r.name} (${r.phone})`).join(' · ') || '—'}</p>
                    <p className="sm:col-span-2"><b>Consent to checks:</b> {payload.consentToChecks ? 'Given' : 'Not given'}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  <Btn size="sm" variant="secondary" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                    {expanded === a.id ? 'Hide details' : 'Review details'}
                  </Btn>
                  {next && (
                    <Btn size="sm" disabled={busy === a.id} onClick={() => advance(a.id, next)}>
                      {busy === a.id ? 'Updating…' : `Advance → ${CHW_STAGE_LABELS[next]}`}
                    </Btn>
                  )}
                  {a.stage !== 'suspended' && a.stage !== 'rejected' && a.stage !== 'approved_home_visits' && (
                    <Btn size="sm" variant="danger-soft" disabled={busy === a.id} onClick={() => advance(a.id, 'suspended')}>Suspend</Btn>
                  )}
                  {a.stage !== 'rejected' && a.stage !== 'approved_home_visits' && (
                    <Btn size="sm" variant="danger" disabled={busy === a.id} onClick={() => advance(a.id, 'rejected')}>Reject</Btn>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
