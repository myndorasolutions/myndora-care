import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplication } from './ApplicantLayout';
import { Badge, Btn, Card, PageHeader } from '@/components/kit';

const MODULES = [
  { id: 't1', title: 'Patient privacy & consent', mins: 25, text: 'Minimum-necessary disclosure, patient-controlled access, and why payment never grants health information.' },
  { id: 't2', title: 'Visit verification protocol', mins: 30, text: 'GPS check-in, OTP patient verification, patient confirmation before check-out, and evidence standards.' },
  { id: 't3', title: 'Vitals recording & abnormality handling', mins: 35, text: 'Accurate recording, mandatory repeat for abnormal values, and when to escalate.' },
  { id: 't4', title: 'Escalation & emergency boundaries', mins: 20, text: 'Myndora Care does not replace emergency services — escalation paths and red-flag symptoms.' },
  { id: 't5', title: 'Conduct, complaints & fair process', mins: 15, text: 'Professional boundaries, complaint handling, and your right to respond.' },
];

export function ApplicantTrainingPage() {
  const navigate = useNavigate();
  const { status, training, editable, updateStepData, submitApplication } = useApplication();
  const studied = training.studiedModuleIds;
  const [open, setOpen] = useState<string | null>(null);

  const markStudied = (id: string) => {
    if (!editable || studied.includes(id)) return;
    updateStepData('training', { studiedModuleIds: [...studied, id] });
  };

  const submit = () => {
    submitApplication();
    navigate('/applicant/status');
  };

  const passed = status === 'APPROVED';

  return (
    <div>
      <PageHeader
        title="Training"
        subtitle="Five required modules before activation. Study here; completion is confirmed by staff assessment at the training stage."
      />
      <div className="space-y-2.5">
        {passed && (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <p className="text-sm font-bold text-emerald-800">
              Training completed and confirmed by Myndora Care staff.
            </p>
          </Card>
        )}
        {MODULES.map((m, i) => (
          <Card key={m.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold text-slate-900">
                  Module {i + 1}: {m.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{m.mins} min</p>
              </div>
              <div className="flex items-center gap-2">
                {passed || studied.includes(m.id) ? (
                  <Badge tone="green">studied</Badge>
                ) : (
                  <Badge tone="gray">not started</Badge>
                )}
                <Btn
                  size="sm"
                  variant="secondary"
                  onClick={() => setOpen(open === m.id ? null : m.id)}
                >
                  {open === m.id ? 'Close' : 'Study'}
                </Btn>
              </div>
            </div>
            {open === m.id && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3.5">
                <p className="text-sm text-slate-700">{m.text}</p>
                {!passed && !studied.includes(m.id) && (
                  <Btn size="sm" className="mt-3" disabled={!editable} onClick={() => markStudied(m.id)}>
                    Mark as studied
                  </Btn>
                )}
              </div>
            )}
          </Card>
        ))}
        <div className="flex gap-2 pt-2">
          <Btn size="sm" variant="secondary" onClick={() => navigate('/applicant/references')}>
            Back
          </Btn>
          <Btn size="sm" disabled={!editable} onClick={submit}>
            Submit application
          </Btn>
        </div>
        {editable && (
          <p className="text-xs text-slate-400">
            Submitting sets your application to under review and saves a draft locally on this device.
          </p>
        )}
      </div>
    </div>
  );
}
