// CHW Service Area: city, neighbourhoods served, matching radius.
import { useState } from 'react';
import type { City } from '@/types';
import { useStore } from '@/store/useStore';
import { useToast } from '@/store/ui';
import { Btn, Card, Field, Input, PageHeader, Select, KV } from '@/components/kit';

const CITIES: City[] = ['Lagos', 'Ilorin', 'Abuja', 'Other'];

export default function ChwServiceArea() {
  const chwId = useStore((s) => s.identity.chwId);
  const chw = useStore((s) => s.chws.find((c) => c.id === s.identity.chwId));
  const updateChwProfile = useStore((s) => s.updateChwProfile);
  const assignments = useStore((s) => s.assignments);
  const { toast } = useToast();

  const [city, setCity] = useState<City | null>(null);
  const [area, setArea] = useState<string | null>(null);
  if (!chw) return null;

  const currentCity = city ?? chw.city;
  const currentArea = area ?? chw.serviceArea;
  const inArea = assignments.filter((a) => a.chwId === chwId).length;

  const save = () => {
    updateChwProfile(chwId, { city: currentCity, serviceArea: currentArea });
    toast('Service area updated');
  };

  return (
    <div>
      <PageHeader title="Service Area" subtitle="Where you work. Assignments are only offered inside your city, service area and radius." />
      <Card className="mb-4 space-y-3.5">
        <div className="grid sm:grid-cols-2 gap-3.5">
          <Field label="City">
            <Select value={currentCity} onChange={(e) => setCity(e.target.value as City)} aria-label="City">
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Neighbourhoods you cover" hint="Approximate area shown to patients before acceptance — never your home address.">
            <Input value={currentArea} onChange={(e) => setArea(e.target.value)} aria-label="Neighbourhoods you cover" />
          </Field>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" onClick={save}>Save service area</Btn>
          <Btn size="sm" variant="secondary" onClick={() => { setCity(null); setArea(null); }}>Cancel</Btn>
        </div>
      </Card>
      <Card>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Current matching</p>
        <div className="space-y-1">
          <KV label="Base radius">{chw.baseRadiusKm} km</KV>
          <KV label="Assignments linked to you">{inArea}</KV>
          <KV label="Matching status">{chw.matchingSuspended ? 'Suspended pending review' : chw.available ? 'Active' : 'Paused (you are unavailable)'}</KV>
        </div>
      </Card>
    </div>
  );
}
