// CHW Availability: accept-work toggle, weekly availability and travel radius.
import { useStore } from '@/store/useStore';
import { useToast } from '@/store/ui';
import { Btn, Card, PageHeader, Toggle, Badge } from '@/components/kit';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ChwAvailability() {
  const chwId = useStore((s) => s.identity.chwId);
  const chw = useStore((s) => s.chws.find((c) => c.id === s.identity.chwId));
  const setAvailability = useStore((s) => s.setAvailability);
  const updateChwProfile = useStore((s) => s.updateChwProfile);
  const { toast } = useToast();

  if (!chw) return null;
  const days = chw.availabilityDays ?? ['Mon', 'Wed', 'Fri'];

  const toggleDay = (d: string) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    updateChwProfile(chwId, { availabilityDays: next });
  };

  return (
    <div>
      <PageHeader title="Availability" subtitle="Control when you receive assignment offers. Going unavailable pauses new offers immediately; accepted visits are unaffected." />
      <Card className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900">Accepting new assignments</p>
            <p className="text-xs text-slate-500 mt-0.5">Operations matches you inside your service area and radius.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={chw.available ? 'green' : 'gray'}>{chw.available ? 'Available' : 'Unavailable'}</Badge>
            <Toggle checked={chw.available} onChange={(v) => { setAvailability(chwId, v); toast(v ? 'You are now available for assignments' : 'New assignment offers paused'); }} label="Accepting new assignments" />
          </div>
        </div>
      </Card>
      <Card className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Available days</p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <label key={d} className={`rounded-full border px-3 py-1.5 text-sm cursor-pointer ${days.includes(d) ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold' : 'border-slate-200'}`}>
              <input type="checkbox" className="sr-only" checked={days.includes(d)} onChange={() => toggleDay(d)} aria-label={`Available ${d}`} />
              {d}
            </label>
          ))}
        </div>
      </Card>
      <Card>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Travel radius</p>
        <p className="text-sm text-slate-600 mb-3">You currently accept visits within <b>{chw.baseRadiusKm} km</b> of your base in {chw.city}.</p>
        <div className="flex flex-wrap gap-2">
          {[3, 5, 8, 12, 20].map((km) => (
            <Btn key={km} variant={chw.baseRadiusKm === km ? 'primary' : 'secondary'} size="sm"
              onClick={() => { updateChwProfile(chwId, { baseRadiusKm: km }); toast(`Radius set to ${km} km`); }}>
              {km} km
            </Btn>
          ))}
        </div>
      </Card>
    </div>
  );
}
