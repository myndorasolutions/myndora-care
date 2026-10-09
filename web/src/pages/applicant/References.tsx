import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplication } from './ApplicantLayout';
import { Badge, Btn, Card, Field, Input, PageHeader } from '@/components/kit';

export function ApplicantReferencesPage() {
  const navigate = useNavigate();
  const { references, status, editable, updateStepData } = useApplication();

  const [r1n, setR1n] = useState(references[0].name);
  const [r1p, setR1p] = useState(references[0].phone);
  const [r2n, setR2n] = useState(references[1].name);
  const [r2p, setR2p] = useState(references[1].phone);

  useEffect(() => {
    setR1n(references[0].name);
    setR1p(references[0].phone);
    setR2n(references[1].name);
    setR2p(references[1].phone);
  }, [references]);

  const saveAndContinue = () => {
    updateStepData('references', [
      { name: r1n, phone: r1p },
      { name: r2n, phone: r2p },
    ]);
    navigate('/applicant/training');
  };

  return (
    <div>
      <PageHeader
        title="References"
        subtitle="Two professional references are contacted during the references stage. Keep their details current."
      />
      <Card className="space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Reference 1 name">
            <Input
              value={r1n}
              onChange={(e) => setR1n(e.target.value)}
              readOnly={!editable}
              aria-label="Reference 1 name"
            />
          </Field>
          <Field label="Reference 1 phone">
            <Input
              value={r1p}
              onChange={(e) => setR1p(e.target.value)}
              readOnly={!editable}
              aria-label="Reference 1 phone"
            />
          </Field>
          <Field label="Reference 2 name">
            <Input
              value={r2n}
              onChange={(e) => setR2n(e.target.value)}
              readOnly={!editable}
              aria-label="Reference 2 name"
            />
          </Field>
          <Field label="Reference 2 phone">
            <Input
              value={r2p}
              onChange={(e) => setR2p(e.target.value)}
              readOnly={!editable}
              aria-label="Reference 2 phone"
            />
          </Field>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">Contact status:</p>
          {status === 'APPROVED' ? (
            <Badge tone="green">References contacted</Badge>
          ) : status === 'UNDER_REVIEW' ? (
            <Badge tone="amber">Being contacted</Badge>
          ) : (
            <Badge tone="gray">Not yet</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Btn size="sm" variant="secondary" onClick={() => navigate('/applicant/qualifications')}>
            Back
          </Btn>
          <Btn size="sm" disabled={!editable} onClick={saveAndContinue}>
            Save & continue
          </Btn>
        </div>
      </Card>
    </div>
  );
}
