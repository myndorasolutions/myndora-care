// Clinician — Profile & Verification: scope of practice and verification status.
import { BadgeCheck } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { Badge, Card, KV, PageHeader } from '@/components/kit';

export default function ClinicianProfile() {
  const account = useAuth((s) => s.session?.account);
  const name = account?.name ?? 'Reviewing clinician';
  const email = account?.email ?? '—';

  return (
    <div>
      <PageHeader title="Profile & Verification" subtitle="Your professional scope determines which cases are routed to you." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mc-section-title">{name}</h3>
          <KV label="Profession">General Practitioner</KV>
          <KV label="Account email">{email}</KV>
          <KV label="Languages">English, Yoruba</KV>
          <KV label="Based in">Lagos (remote reviews nationwide)</KV>
        </Card>
        <Card>
          <h3 className="mc-section-title">Professional scope</h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {['Hypertension', 'Type 2 Diabetes', 'Post-operative care', 'Flagged lab results', 'Medication review'].map((s) => (
              <Badge key={s} tone="indigo">{s}</Badge>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Cases outside this scope are routed to a different reviewer. Clinician reviews inform care coordination — they do not replace in-person diagnosis.
          </p>
        </Card>
      </div>

      <h2 className="mc-section-title mt-6">Verification status</h2>
      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
            <BadgeCheck size={16} /> Approved
          </span>
          <Badge tone="green">verified clinician</Badge>
        </div>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <KV label="Registration number">MDCN-41728 (demo)</KV>
          <KV label="Licensing authority">Medical and Dental Council of Nigeria</KV>
          <KV label="Qualification">MBBS, University of Ibadan</KV>
          <KV label="Speciality">Family Medicine</KV>
          <KV label="Experience">12 years</KV>
          <KV label="Facility">Independent practice — remote reviews</KV>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Identity photo and supporting documents were reviewed by Myndora Care administration before approval.
          A suspended clinician immediately loses access to active professional workflows until reinstated.
        </p>
      </Card>

      <h2 className="mc-section-title mt-6">What this portal does not include</h2>
      <Card>
        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
          <li>Sponsor billing, invoices, or payment details</li>
          <li>Community health worker payouts or rates</li>
          <li>Administrative approvals and platform configuration</li>
          <li>Patients who have not been routed to you</li>
        </ul>
      </Card>
    </div>
  );
}
