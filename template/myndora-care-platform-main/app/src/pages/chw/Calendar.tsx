// CHW — Calendar: week view of assignments and visits.
import { fmtTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Badge, Card, PageHeader, type BadgeTone } from '@/components/kit';

const DAYS = ['Mon 27', 'Tue 28', 'Wed 29', 'Thu 30', 'Fri 31', 'Sat 1', 'Sun 2'];
const DAY_DATES = ['2024-05-27', '2024-05-28', '2024-05-29', '2024-05-30', '2024-05-31', '2024-06-01', '2024-06-02'];
const STATUS_TONE: Record<string, BadgeTone> = { offered: 'amber', accepted: 'green', completed: 'blue', verified: 'green', scheduled: 'blue', in_progress: 'amber' };

export default function ChwCalendar() {
  const ME = useStore((s) => s.identity.chwId);
  const assignments = useStore(useShallow((s) => s.assignments.filter((a) => a.chwId === ME && a.status !== 'declined' && a.status !== 'cancelled')));
  const visits = useStore(useShallow((s) => s.visits.filter((v) => v.chwId === ME)));
  const patients = useStore((s) => s.patients);

  const events = [
    ...assignments.map((a) => ({
      date: a.scheduledFor.slice(0, 10), time: fmtTime(a.scheduledFor),
      title: `${patients.find((p) => p.id === a.patientId)?.name} — ${a.serviceType.replace('_', ' ')}`,
      status: a.status,
    })),
    ...visits.filter((v) => !v.assignmentId).map((v) => ({
      date: v.scheduledFor.slice(0, 10), time: fmtTime(v.scheduledFor),
      title: `${patients.find((p) => p.id === v.patientId)?.name} — visit`,
      status: v.status,
    })),
  ];

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Your week at a glance. Times are shown in the patient's local time." />
      <div className="grid gap-3 md:grid-cols-7">
        {DAYS.map((day, i) => {
          const dayEvents = events.filter((e) => e.date === DAY_DATES[i]);
          return (
            <Card key={day} className="min-h-[140px] !p-3">
              <p className="text-xs font-bold text-slate-700 mb-2">{day}</p>
              {dayEvents.length === 0 ? (
                <p className="text-xs text-slate-400">Free</p>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((e, j) => (
                    <div key={j} className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                      <p className="text-[11px] font-semibold text-slate-800 leading-tight">{e.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-500">{e.time}</span>
                        <Badge tone={STATUS_TONE[e.status] ?? 'gray'}>{e.status.replace('_', ' ')}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
