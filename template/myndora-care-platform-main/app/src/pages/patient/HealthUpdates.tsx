// Patient — Health Updates: timeline of vitals, alerts, visits, referrals.
import { Activity, AlertTriangle, CalendarCheck, FlaskConical, Pill } from 'lucide-react';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Badge, Card, PageHeader, type BadgeTone } from '@/components/kit';


export default function PatientHealthUpdates() {
  const ME = useStore((s) => s.identity.patientId);
  const vitals = useStore(useShallow((s) => s.vitals.filter((v) => v.patientId === ME)));
  const alerts = useStore(useShallow((s) => s.alerts.filter((a) => a.patientId === ME)));
  const visits = useStore(useShallow((s) => s.visits.filter((v) => v.patientId === ME && (v.status === 'verified' || v.status === 'submitted'))));
  const referrals = useStore(useShallow((s) => s.referrals.filter((r) => r.patientId === ME)));

  const items = [
    ...vitals.map((v) => ({
      at: v.recordedAt, icon: <Activity size={15} />,
      title: `${v.kind.replace('_', ' ')} — ${v.value} ${v.unit}`,
      detail: `${v.source === 'measured' ? 'Measured by CHW' : 'Reported by you'} · ${v.deviceType}`,
      tone: (v.isAbnormal ? 'red' : 'green') as BadgeTone, badge: v.isAbnormal ? 'Abnormal' : 'Normal',
    })),
    ...alerts.map((a) => ({
      at: a.createdAt, icon: <AlertTriangle size={15} />,
      title: a.title, detail: a.detail,
      tone: (a.severity === 'urgent' ? 'red' : 'amber') as BadgeTone, badge: a.status.replace('_', ' '),
    })),
    ...visits.map((v) => ({
      at: v.scheduledFor, icon: <CalendarCheck size={15} />,
      title: 'Visit completed', detail: v.patientSummary || 'Visit completed.',
      tone: 'blue' as BadgeTone, badge: v.status,
    })),
    ...referrals.map((r) => ({
      at: r.createdAt, icon: r.kind === 'lab' ? <FlaskConical size={15} /> : <Pill size={15} />,
      title: `${r.partner}`, detail: r.description,
      tone: 'purple' as BadgeTone, badge: r.status.replace('_', ' '),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div>
      <PageHeader title="Health Updates" subtitle="A readable timeline of your readings, visits, alerts and partner services. Measured readings and your own reports are labelled separately." />
      <Card>
        <ol className="relative border-l-2 border-slate-200 pl-6 space-y-6">
          {items.map((it, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-white border border-slate-300 grid place-items-center text-slate-500">
                {it.icon}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-sm text-slate-900 capitalize">{it.title}</p>
                <Badge tone={it.tone}>{it.badge}</Badge>
              </div>
              <p className="text-sm text-slate-600 mt-0.5">{it.detail}</p>
              <p className="text-xs text-slate-400 mt-0.5">{fmtDateTime(it.at)}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
