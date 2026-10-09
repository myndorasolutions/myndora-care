// CHW Profile & Verification: public profile summary + verification checklist status.
import { Badge, Card, PageHeader, KV } from '@/components/kit';
import { useStore } from '@/store/useStore';

const CHECKS: { key: keyof import('@/types').CHWProfile['verification']; label: string }[] = [
  { key: 'identityChecked', label: 'Identity check' },
  { key: 'qualificationsChecked', label: 'Qualification review' },
  { key: 'referencesChecked', label: 'References' },
  { key: 'backgroundChecked', label: 'Background check' },
  { key: 'trainingCompleted', label: 'Required training' },
];

export default function ChwVerification() {
  const chw = useStore((s) => s.chws.find((c) => c.id === s.identity.chwId));
  if (!chw) return null;
  const done = CHECKS.filter((c) => chw.verification[c.key]).length;

  return (
    <div>
      <PageHeader title="Profile & Verification" subtitle="What patients see about you, and the status of every verification check behind your approval." />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Your CHW profile</p>
          <div className="space-y-1">
            <KV label="Name">{chw.name}</KV>
            <KV label="Cadre">{chw.cadre}</KV>
            <KV label="Experience">{chw.yearsExperience} years</KV>
            <KV label="Languages">{chw.languages.join(', ')}</KV>
            <KV label="City / area">{chw.city} · {chw.serviceArea}</KV>
            <KV label="Photo verified">{chw.photoVerified ? <Badge tone="green">Yes</Badge> : <Badge tone="amber">Pending</Badge>}</KV>
            <KV label="Status"><Badge tone={chw.status === 'approved' ? 'green' : chw.status === 'suspended' ? 'red' : 'amber'}>{chw.status}</Badge></KV>
            <KV label="Rating">{chw.rating > 0 ? `${chw.rating.toFixed(1)} (${chw.reviewCount} reviews)` : 'No ratings yet'}</KV>
            <KV label="Completed visits">{chw.completedVisits}</KV>
            <KV label="Reliability score">{chw.reliabilityScore}/100</KV>
          </div>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Verification checklist</p>
          <p className="text-xs text-slate-500 mb-3">{done} of {CHECKS.length} checks complete. Approval for remote checks and for home visits are separate stages.</p>
          <div className="space-y-2">
            {CHECKS.map((c) => (
              <div key={c.key} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
                <p className="text-sm font-semibold text-slate-800">{c.label}</p>
                {chw.verification[c.key] ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>}
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
              <p className="text-sm font-semibold text-slate-800">NIN on file</p>
              <Badge tone={chw.verification.nin === 'verified' ? 'green' : 'amber'}>{chw.verification.nin}</Badge>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Checks are performed by Myndora Care staff. Contact operations from Messages if a check is stuck.</p>
        </Card>
      </div>
    </div>
  );
}
