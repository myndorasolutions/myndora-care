// Admin — Patients: overview with reassignment shortcut.
import { useNavigate } from 'react-router-dom';
import { packageDef } from '@/lib/permissions';
import { useStore } from '@/store/useStore';
import { Badge, Btn, Card, KV, PageHeader } from '@/components/kit';
import { initials } from '@/lib/format';

export default function AdminPatients() {
  const navigate = useNavigate();
  const patients = useStore((s) => s.patients);
  const subscriptions = useStore((s) => s.subscriptions);
  const selectedChwByPatient = useStore((s) => s.selectedChwByPatient);
  const chws = useStore((s) => s.chws);
  const selectPatient = useStore((s) => s.selectPatient);

  return (
    <div>
      <PageHeader title="Patients" subtitle="All registered patients with package, location and assigned CHW." />
      <div className="grid gap-4 lg:grid-cols-2">
        {patients.map((p) => {
          const sub = subscriptions.find((x) => x.patientId === p.id);
          const chw = chws.find((c) => c.id === selectedChwByPatient[p.id]);
          return (
            <Card key={p.id}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full grid place-items-center text-white font-bold" style={{ background: 'linear-gradient(135deg,var(--accent),#19c6b2)' }}>{initials(p.name)}</div>
                <div>
                  <h3 className="font-bold text-slate-900">{p.name}</h3>
                  <p className="text-xs text-slate-500">{p.age} yrs · {p.neighbourhood}, {p.city}</p>
                </div>
              </div>
              <KV label="Package">{sub ? <Badge tone="green">{packageDef(sub.tier).name}</Badge> : '—'}</KV>
              <KV label="Conditions">{p.conditions.join(', ')}</KV>
              <KV label="Assigned CHW">{chw ? `${chw.name} (${chw.cadre})` : 'None'}</KV>
              <KV label="Exact address"><span className="text-xs">{p.address}</span></KV>
              <div className="flex gap-2 mt-3">
                <Btn size="sm" variant="secondary" onClick={() => { selectPatient(p.id); navigate('/admin/assignments'); }}>Manage assignment</Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
