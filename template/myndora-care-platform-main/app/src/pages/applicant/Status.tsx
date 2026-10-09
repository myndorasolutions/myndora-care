// Applicant Application Status: current stage, full pipeline, outstanding actions.
import { useNavigate } from 'react-router-dom';
import type { ChwApplicationStage } from '@contracts/types';
import { CHW_STAGE_LABELS } from '@contracts/types';
import { useApplication } from './ApplicantLayout';
import { Badge, Btn, Card, EmptyState, PageHeader } from '@/components/kit';

const PIPELINE: ChwApplicationStage[] = [
  'application_started', 'identity_review', 'qualification_review',
  'references_pending', 'training_required', 'approved_remote', 'approved_home_visits',
];

const OUTSTANDING: Partial<Record<ChwApplicationStage, { text: string; to: string }[]>> = {
  identity_review: [{ text: 'Confirm your identity details and documents are complete', to: '/applicant/identity' }],
  qualification_review: [{ text: 'Check your qualification and registration details', to: '/applicant/qualifications' }],
  references_pending: [{ text: 'Make sure both references are reachable at the numbers given', to: '/applicant/references' }],
  training_required: [{ text: 'Complete the required training modules', to: '/applicant/training' }],
  approved_remote: [{ text: 'Home-visit approval is the final stage — keep your service area up to date', to: '/applicant/service-area' }],
};

export default function ApplicantStatus() {
  const navigate = useNavigate();
  const { app, loading } = useApplication();

  if (loading) return <Card><p className="text-sm text-slate-500">Loading your application…</p></Card>;
  if (!app) {
    return (
      <Card>
        <EmptyState
          title="No application found"
          hint="Start your Community Health Worker application to enter the verification pipeline."
          action={<Btn onClick={() => navigate('/onboarding/chw')}>Start application</Btn>}
        />
      </Card>
    );
  }

  const idx = PIPELINE.indexOf(app.stage);
  const terminal = app.stage === 'suspended' || app.stage === 'rejected';

  return (
    <div>
      <PageHeader title="Application Status" subtitle="Track every verification stage. You will see outstanding actions here whenever something is needed from you." />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-base font-extrabold text-slate-900">{app.applicantName} · {app.city}</p>
          <Badge tone={terminal ? 'red' : app.stage.startsWith('approved') ? 'green' : 'amber'}>{CHW_STAGE_LABELS[app.stage]}</Badge>
        </div>
        {terminal ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-slate-700">
            {app.stage === 'rejected'
              ? 'This application was not approved. You may re-apply with updated information — contact operations if you believe this is an error.'
              : 'This application is currently suspended pending a review. Contact operations from Messages for details.'}
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {PIPELINE.map((s, i) => {
              const done = idx > i || app.stage === 'approved_home_visits';
              const current = idx === i;
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold shrink-0 ${done ? 'bg-emerald-500 text-white' : current ? 'text-white' : 'bg-slate-200 text-slate-500'}`} style={current ? { background: 'var(--accent, var(--blue))' } : undefined}>
                    {done ? '✓' : i + 1}
                  </span>
                  <p className={`text-sm ${current ? 'font-extrabold text-slate-900' : done ? 'font-semibold text-slate-700' : 'text-slate-400'}`}>
                    {CHW_STAGE_LABELS[s]}
                    {current && <Badge tone="amber">current</Badge>}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {!terminal && (
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Outstanding actions</p>
          {app.stage === 'approved_home_visits' ? (
            <p className="text-sm text-slate-600">None — you are fully approved. Sign out and back in to open your CHW Workbench.</p>
          ) : (
            <div className="space-y-2">
              {(OUTSTANDING[app.stage] ?? [{ text: 'Nothing needed from you right now — our team is reviewing your application', to: '' }]).map((a) => (
                <div key={a.text} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                  <p className="text-sm text-slate-700">{a.text}</p>
                  {a.to && <Btn size="sm" variant="secondary" onClick={() => navigate(a.to)}>Open</Btn>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
