// Applicant Training: required modules, unlocks at the training stage.
// Completion is recorded by staff after assessment — the applicant can study and self-test here.
import { useState } from 'react';
import { useApplication } from './ApplicantLayout';
import { Badge, Btn, Card, PageHeader } from '@/components/kit';

const MODULES = [
  { id: 't1', title: 'Patient privacy & consent', mins: 25, text: 'Minimum-necessary disclosure, patient-controlled access, and why payment never grants health information.' },
  { id: 't2', title: 'Visit verification protocol', mins: 30, text: 'GPS check-in, OTP patient verification, patient confirmation before check-out, and evidence standards.' },
  { id: 't3', title: 'Vitals recording & abnormality handling', mins: 35, text: 'Accurate recording, mandatory repeat for abnormal values, and when to escalate.' },
  { id: 't4', title: 'Escalation & emergency boundaries', mins: 20, text: 'Myndora Care does not replace emergency services — escalation paths and red-flag symptoms.' },
  { id: 't5', title: 'Conduct, complaints & fair process', mins: 15, text: 'Professional boundaries, complaint handling, and your right to respond.' },
];

export default function ApplicantTraining() {
  const { app, loading } = useApplication();
  const [studied, setStudied] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  if (loading) return <Card><p className="text-sm text-slate-500">Loading…</p></Card>;
  if (!app) return <Card><p className="text-sm text-slate-500">No application found.</p></Card>;

  const unlocked = ['training_required', 'approved_remote', 'approved_home_visits'].includes(app.stage);
  const passed = ['approved_remote', 'approved_home_visits'].includes(app.stage);

  return (
    <div>
      <PageHeader title="Training" subtitle="Five required modules before activation. Study here; completion is confirmed by staff assessment at the training stage." />
      {!unlocked ? (
        <Card>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Training unlocks when your application reaches the <b>Training required</b> stage. Current stage: <b>{app.stage.replace(/_/g, ' ')}</b>.
          </div>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {passed && (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <p className="text-sm font-bold text-emerald-800">Training completed and confirmed by Myndora Care staff.</p>
            </Card>
          )}
          {MODULES.map((m, i) => (
            <Card key={m.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">Module {i + 1}: {m.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{m.mins} min</p>
                </div>
                <div className="flex items-center gap-2">
                  {passed || studied.includes(m.id) ? <Badge tone="green">studied</Badge> : <Badge tone="gray">not started</Badge>}
                  <Btn size="sm" variant="secondary" onClick={() => setOpen(open === m.id ? null : m.id)}>{open === m.id ? 'Close' : 'Study'}</Btn>
                </div>
              </div>
              {open === m.id && (
                <div className="mt-3 rounded-xl bg-slate-50 p-3.5">
                  <p className="text-sm text-slate-700">{m.text}</p>
                  {!passed && !studied.includes(m.id) && (
                    <Btn size="sm" className="mt-3" onClick={() => setStudied((s) => [...s, m.id])}>Mark as studied</Btn>
                  )}
                </div>
              )}
            </Card>
          ))}
          {!passed && (
            <p className="text-xs text-slate-400">Self-study progress is local to this session. Staff confirm completion after a short assessment call.</p>
          )}
        </div>
      )}
    </div>
  );
}
