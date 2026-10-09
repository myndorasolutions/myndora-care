// Applicant Qualifications: submitted credentials and review status, amendable in review.
import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/store/ui';
import { useApplication } from './ApplicantLayout';
import { Badge, Btn, Card, Field, Input, PageHeader } from '@/components/kit';

export default function ApplicantQualifications() {
  const { app, loading, reload } = useApplication();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [qualification, setQualification] = useState('');
  const [registration, setRegistration] = useState('');
  const [experience, setExperience] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Card><p className="text-sm text-slate-500">Loading…</p></Card>;
  if (!app) return <Card><p className="text-sm text-slate-500">No application found.</p></Card>;

  const p = app.payload as Record<string, unknown>;
  const editable = !['approved_remote', 'approved_home_visits', 'rejected'].includes(app.stage);

  const startEdit = () => {
    setQualification(String(p.qualification ?? ''));
    setRegistration(String(p.registration ?? ''));
    setExperience(String(p.yearsExperience ?? ''));
    setEditing(true);
  };
  const save = async () => {
    setBusy(true);
    try {
      await api.onboarding.updateChwApplication.mutate({ payload: { qualification, registration, yearsExperience: Number(experience) || 0 } });
      await reload();
      setEditing(false);
      toast('Qualifications updated — review continues with the new details');
    } catch {
      toast('Could not update — applications under final decision cannot be edited');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Qualifications" subtitle="What you submitted and where each item stands in the qualification review." />
      <Card className="space-y-3.5">
        <div className="grid sm:grid-cols-2 gap-3.5">
          <Field label="Cadre"><Input value={String(p.cadre ?? '—')} readOnly aria-label="Cadre" /></Field>
          <Field label="Qualification">
            {editing ? <Input value={qualification} onChange={(e) => setQualification(e.target.value)} aria-label="Qualification" /> : <Input value={String(p.qualification ?? '—')} readOnly aria-label="Qualification" />}
          </Field>
          <Field label="Registration / licence number">
            {editing ? <Input value={registration} onChange={(e) => setRegistration(e.target.value)} aria-label="Registration number" /> : <Input value={String(p.registration ?? '—')} readOnly aria-label="Registration number" />}
          </Field>
          <Field label="Years of experience">
            {editing ? <Input type="number" min="0" max="50" value={experience} onChange={(e) => setExperience(e.target.value)} aria-label="Years of experience" /> : <Input value={String(p.yearsExperience ?? '—')} readOnly aria-label="Years of experience" />}
          </Field>
          <Field label="Languages"><Input value={(p.languages as string[] | undefined)?.join(', ') ?? '—'} readOnly aria-label="Languages" /></Field>
          <Field label="Review status">
            <div className="pt-2">
              <Badge tone={app.stage === 'qualification_review' ? 'amber' : ['references_pending', 'training_required', 'approved_remote', 'approved_home_visits'].includes(app.stage) ? 'green' : 'gray'}>
                {app.stage === 'qualification_review' ? 'In review now' : ['references_pending', 'training_required', 'approved_remote', 'approved_home_visits'].includes(app.stage) ? 'Passed' : 'Queued'}
              </Badge>
            </div>
          </Field>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Btn size="sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</Btn>
              <Btn size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Btn>
            </>
          ) : (
            <Btn size="sm" variant="secondary" disabled={!editable} onClick={startEdit}>
              {editable ? 'Update qualifications' : 'Locked after final decision'}
            </Btn>
          )}
        </div>
      </Card>
    </div>
  );
}
