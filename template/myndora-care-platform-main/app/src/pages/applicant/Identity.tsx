// Applicant Identity & Documents: view/amend identity details while in review.
import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/store/ui';
import { useApplication } from './ApplicantLayout';
import { Badge, Btn, Card, Field, Input, PageHeader } from '@/components/kit';

export default function ApplicantIdentity() {
  const { app, loading, reload } = useApplication();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Card><p className="text-sm text-slate-500">Loading…</p></Card>;
  if (!app) return <Card><p className="text-sm text-slate-500">No application found.</p></Card>;

  const p = app.payload as Record<string, unknown>;
  const editable = !['approved_remote', 'approved_home_visits', 'rejected'].includes(app.stage);

  const startEdit = () => { setPhone(String(p.phone ?? '')); setPhotoName(String(p.photoName ?? '')); setEditing(true); };
  const save = async () => {
    setBusy(true);
    try {
      await api.onboarding.updateChwApplication.mutate({ payload: { phone, photoName } });
      await reload();
      setEditing(false);
      toast('Identity details updated');
    } catch {
      toast('Could not update — applications under final decision cannot be edited');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Identity & Documents" subtitle="Your legal identity as reviewed by our verification team. NIN is masked; documents are checked by staff, never shown to patients." />
      <Card className="space-y-3.5">
        <div className="grid sm:grid-cols-2 gap-3.5">
          <Field label="Legal name"><Input value={app.applicantName} readOnly aria-label="Legal name" /></Field>
          <Field label="Email"><Input value="Registered on your account" readOnly aria-label="Email" /></Field>
          <Field label="Phone">
            {editing ? <Input value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone" /> : <Input value={String(p.phone ?? '—')} readOnly aria-label="Phone" />}
          </Field>
          <Field label="NIN">
            <Input value={p.nin ? `•••••••${String(p.nin).slice(-4)}` : '—'} readOnly aria-label="NIN" />
          </Field>
          <Field label="Profile photo" hint={editing ? 'Choose a replacement photo' : undefined}>
            {editing
              ? <Input type="file" accept="image/*" onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? '')} aria-label="Profile photo" />
              : <Input value={String(p.photoName ?? 'Not uploaded')} readOnly aria-label="Profile photo" />}
          </Field>
          <Field label="Document status">
            <div className="pt-2"><Badge tone="amber">Under staff review</Badge></div>
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
              {editable ? 'Update phone or photo' : 'Locked after final decision'}
            </Btn>
          )}
        </div>
      </Card>
    </div>
  );
}
