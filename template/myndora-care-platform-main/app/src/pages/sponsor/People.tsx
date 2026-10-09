// Sponsor — People I Support
import { useNavigate } from 'react-router-dom';
import { accessLabel, packageDef } from '@/lib/permissions';
import { useStore } from '@/store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Badge, Btn, Card, KV, PageHeader } from '@/components/kit';
import { initials } from '@/lib/format';

export default function SponsorPeople() {
  const SPONSOR_ID = useStore((s) => s.identity.sponsorAccountId);
  const navigate = useNavigate();
  const relationships = useStore(useShallow((s) => s.relationships.filter((r) => r.sponsorAccountId === SPONSOR_ID)));
  const patients = useStore((s) => s.patients);
  const subscriptions = useStore((s) => s.subscriptions);
  const selectedPatientId = useStore((s) => s.selectedPatientId);
  const selectPatient = useStore((s) => s.selectPatient);

  return (
    <div>
      <PageHeader title="People I Support" subtitle="Select a person to manage their plan, services, visits and access requests." />
      <div className="grid gap-4 md:grid-cols-2">
        {relationships.map((rel) => {
          const patient = patients.find((p) => p.id === rel.patientId)!;
          const sub = subscriptions.find((x) => x.patientId === patient.id)!;
          const selected = selectedPatientId === patient.id;
          return (
            <Card key={patient.id} className={selected ? 'ring-2 ring-[var(--accent)]/30 border-[var(--accent)]' : ''}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full grid place-items-center text-white font-bold" style={{ background: 'linear-gradient(135deg,var(--accent),#19c6b2)' }}>
                  {initials(patient.name)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{patient.name}</h3>
                  <p className="text-xs text-slate-500">{patient.relationToSponsor} · {patient.age} yrs · {patient.neighbourhood}, {patient.city}</p>
                </div>
                {selected && <span className="ml-auto"><Badge tone="blue">Selected</Badge></span>}
              </div>
              <KV label="Package"><Badge tone="green">{packageDef(sub.tier).name}</Badge></KV>
              <KV label="Your access level"><Badge tone={rel.accessLevel === 'full_monitoring' ? 'green' : 'gray'}>{accessLabel(rel.accessLevel)}</Badge></KV>
              <KV label="Conditions">{patient.conditions.join(', ')}</KV>
              <div className="flex flex-wrap gap-2 mt-4">
                <Btn size="sm" variant={selected ? 'secondary' : 'primary'} onClick={() => selectPatient(patient.id)}>
                  {selected ? 'Currently selected' : 'Select'}
                </Btn>
                <Btn size="sm" variant="secondary" onClick={() => { selectPatient(patient.id); navigate('/sponsor/plan'); }}>Manage plan</Btn>
                <Btn size="sm" variant="secondary" onClick={() => { selectPatient(patient.id); navigate('/sponsor/team'); }}>Care team</Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
