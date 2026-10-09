// Applicant Service Area: requested city, neighbourhoods, radius and availability.
import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/store/ui';
import { useApplication } from './ApplicantLayout';
import { Btn, Card, Field, Input, PageHeader } from '@/components/kit';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ApplicantServiceArea() {
  const { app, loading, reload } = useApplication();
  const { toast } = useToast();
  const [area, setArea] = useState<string | null>(null);
  const [radius, setRadius] = useState<string | null>(null);
  const [days, setDays] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Card><p className="text-sm text-slate-500">Loading…</p></Card>;
  if (!app) return <Card><p className="text-sm text-slate-500">No application found.</p></Card>;

  const p = app.payload as Record<string, unknown>;
  const editable = !['approved_remote', 'approved_home_visits', 'rejected'].includes(app.stage);
  const currentArea = area ?? String(p.serviceArea ?? '');
  const currentRadius = radius ?? String(p.radiusKm ?? '5');
  const currentDays = days ?? ((p.availability as string[] | undefined) ?? []);

  const toggleDay = (d: string) =>
    setDays(currentDays.includes(d) ? currentDays.filter((x) => x !== d) : [...currentDays, d]);

  const save = async () => {
    setBusy(true);
    try {
      await api.onboarding.updateChwApplication.mutate({ payload: { serviceArea: currentArea, radiusKm: Number(currentRadius) || 5, availability: currentDays } });
      await reload();
      toast('Service area updated');
    } catch {
      toast('Could not update — applications under final decision cannot be edited');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Service Area" subtitle="Where you would work once approved. Matching uses your city, neighbourhoods and radius." />
      <Card className="space-y-3.5">
        <div className="grid sm:grid-cols-2 gap-3.5">
          <Field label="City"><Input value={app.city} readOnly aria-label="City" /></Field>
          <Field label="Neighbourhoods you would cover">
            <Input value={currentArea} onChange={(e) => setArea(e.target.value)} readOnly={!editable} aria-label="Neighbourhoods" />
          </Field>
          <Field label="Travel radius (km)">
            <Input type="number" min="1" max="50" value={currentRadius} onChange={(e) => setRadius(e.target.value)} readOnly={!editable} aria-label="Travel radius" />
          </Field>
          <Field label="Requested services"><Input value={(p.requestedServices as string[] | undefined)?.join(', ') ?? '—'} readOnly aria-label="Requested services" /></Field>
        </div>
        <Field label="Available days">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <label key={d} className={`rounded-full border px-3 py-1 text-sm ${editable ? 'cursor-pointer' : 'opacity-70'} ${currentDays.includes(d) ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold' : 'border-slate-200'}`}>
                <input type="checkbox" className="sr-only" disabled={!editable} checked={currentDays.includes(d)} onChange={() => toggleDay(d)} aria-label={`Available ${d}`} />
                {d}
              </label>
            ))}
          </div>
        </Field>
        {editable && (
          <div className="flex gap-2">
            <Btn size="sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save service area'}</Btn>
            <Btn size="sm" variant="secondary" onClick={() => { setArea(null); setRadius(null); setDays(null); }}>Cancel</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}
