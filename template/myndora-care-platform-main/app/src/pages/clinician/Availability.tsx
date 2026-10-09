// Clinician — Availability: review windows and accepting-cases toggle.
import { useStore } from '@/store/useStore';
import { useToast } from '@/store/ui';
import { Badge, Card, KV, PageHeader, Toggle } from '@/components/kit';

const WINDOWS = [
  { day: 'Monday – Friday', hours: '17:00 – 21:00' },
  { day: 'Saturday', hours: '10:00 – 14:00' },
  { day: 'Sunday', hours: 'Not available' },
];

export default function ClinicianAvailability() {
  const available = useStore((s) => s.clinicianAvailable);
  const setClinicianAvailable = useStore((s) => s.setClinicianAvailable);
  const { toast } = useToast();

  return (
    <div>
      <PageHeader title="Availability" subtitle="Control when flagged cases are routed to you." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="font-bold text-slate-900">Accepting cases</h3>
              <p className="text-xs text-slate-500">When off, new cases route to the next available clinician.</p>
            </div>
            <Toggle checked={available} onChange={(v) => { setClinicianAvailable(v); toast(v ? 'You are accepting cases' : 'Case routing paused'); }} label="Accepting cases" />
          </div>
          <KV label="Current state"><Badge tone={available ? 'green' : 'gray'}>{available ? 'Accepting' : 'Paused'}</Badge></KV>
        </Card>
        <Card>
          <h3 className="mc-section-title">Weekly review windows</h3>
          {WINDOWS.map((w) => <KV key={w.day} label={w.day}>{w.hours}</KV>)}
          <p className="text-xs text-slate-500 mt-3">Urgent escalations are routed immediately during windows; outside windows they queue for the next window.</p>
        </Card>
      </div>
    </div>
  );
}
