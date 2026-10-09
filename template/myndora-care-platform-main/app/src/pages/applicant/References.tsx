// Applicant References: the two referees and their contact status.
import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/store/ui';
import { useApplication } from './ApplicantLayout';
import { Badge, Btn, Card, Field, Input, PageHeader } from '@/components/kit';

export default function ApplicantReferences() {
  const { app, loading, reload } = useApplication();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [r1n, setR1n] = useState(''); const [r1p, setR1p] = useState('');
  const [r2n, setR2n] = useState(''); const [r2p, setR2p] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Card><p className="text-sm text-slate-500">Loading…</p></Card>;
  if (!app) return <Card><p className="text-sm text-slate-500">No application found.</p></Card>;

  const p = app.payload as Record<string, unknown>;
  const refs = (p.references as { name: string; phone: string }[] | undefined) ?? [];
  const editable = !['approved_remote', 'approved_home_visits', 'rejected'].includes(app.stage);
  const contacted = ['training_required', 'approved_remote', 'approved_home_visits'].includes(app.stage);

  const startEdit = () => {
    setR1n(refs[0]?.name ?? ''); setR1p(refs[0]?.phone ?? '');
    setR2n(refs[1]?.name ?? ''); setR2p(refs[1]?.phone ?? '');
    setEditing(true);
  };
  const save = async () => {
    setBusy(true);
    try {
      await api.onboarding.updateChwApplication.mutate({ payload: { references: [{ name: r1n, phone: r1p }, { name: r2n, phone: r2p }] } });
      await reload();
      setEditing(false);
      toast('References updated');
    } catch {
      toast('Could not update — applications under final decision cannot be edited');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="References" subtitle="Two professional references are contacted during the references stage. Keep their details current." />
      <Card className="space-y-3.5">
        <div className="grid sm:grid-cols-2 gap-3.5">
          <Field label="Reference 1 name">{editing ? <Input value={r1n} onChange={(e) => setR1n(e.target.value)} aria-label="Reference 1 name" /> : <Input value={refs[0]?.name ?? '—'} readOnly aria-label="Reference 1 name" />}</Field>
          <Field label="Reference 1 phone">{editing ? <Input value={r1p} onChange={(e) => setR1p(e.target.value)} aria-label="Reference 1 phone" /> : <Input value={refs[0]?.phone ?? '—'} readOnly aria-label="Reference 1 phone" />}</Field>
          <Field label="Reference 2 name">{editing ? <Input value={r2n} onChange={(e) => setR2n(e.target.value)} aria-label="Reference 2 name" /> : <Input value={refs[1]?.name ?? '—'} readOnly aria-label="Reference 2 name" />}</Field>
          <Field label="Reference 2 phone">{editing ? <Input value={r2p} onChange={(e) => setR2p(e.target.value)} aria-label="Reference 2 phone" /> : <Input value={refs[1]?.phone ?? '—'} readOnly aria-label="Reference 2 phone" />}</Field>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">Contact status:</p>
          {contacted ? <Badge tone="green">References contacted</Badge> : app.stage === 'references_pending' ? <Badge tone="amber">Being contacted</Badge> : <Badge tone="gray">Not yet</Badge>}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Btn size="sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</Btn>
              <Btn size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Btn>
            </>
          ) : (
            <Btn size="sm" variant="secondary" disabled={!editable} onClick={startEdit}>
              {editable ? 'Update references' : 'Locked after final decision'}
            </Btn>
          )}
        </div>
      </Card>
    </div>
  );
}
