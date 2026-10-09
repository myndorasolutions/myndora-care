// CHW — Credentials: verification status. Raw documents stay admin-only.
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Badge, Card, KV, PageHeader } from '@/components/kit';


export default function ChwCredentials() {
  const ME = useStore((s) => s.identity.chwId);
  const chw = useStore((s) => s.chws.find((c) => c.id === ME))!;

  const items = [
    { label: 'Identity check', done: chw.verification.identityChecked },
    { label: 'Qualifications verified', done: chw.verification.qualificationsChecked },
    { label: 'References checked', done: chw.verification.referencesChecked },
    { label: 'Background check', done: chw.verification.backgroundChecked },
    { label: 'Training completed', done: chw.verification.trainingCompleted },
    { label: 'Profile photo verified', done: chw.photoVerified },
  ];

  return (
    <div>
      <PageHeader title="Credentials & Verification" subtitle="Your verification status as shown by the trust & safety team." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mc-section-title"><ShieldCheck size={17} /> Verification checklist</h3>
          {items.map((it) => (
            <KV key={it.label} label={it.label}>
              {it.done
                ? <Badge tone="green"><BadgeCheck size={12} /> Verified</Badge>
                : <Badge tone="amber">Pending</Badge>}
            </KV>
          ))}
          <KV label="Overall status"><Badge tone={chw.status === 'approved' ? 'green' : 'amber'}>{chw.status}</Badge></KV>
        </Card>
        <Card>
          <h3 className="mc-section-title">Professional profile</h3>
          <KV label="Cadre">{chw.cadre}</KV>
          <KV label="Experience">{chw.yearsExperience} years</KV>
          <KV label="Languages">{chw.languages.join(', ')}</KV>
          <KV label="Condition training">{chw.conditionTraining.join(', ')}</KV>
          <KV label="Completed visits">{chw.completedVisits} verified</KV>
          <p className="text-xs text-slate-500 mt-3">
            Your NIN, certificates and reference documents are visible only to Myndora administrators — never to patients or sponsors.
          </p>
        </Card>
      </div>
    </div>
  );
}
