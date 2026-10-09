// Sponsor onboarding: supporter details + optional patient linking.
// Enforces the core rule on screen: the patient decides health-information access.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AccessLevel, City, PackageTier } from '@/types';
import { ACCESS_LEVELS, PACKAGES } from '@/lib/permissions';
import { useAuth } from '@/store/auth';
import { useStore } from '@/store/useStore';
import { saveNow } from '@/store/sync';
import PublicShell from '../public/PublicShell';
import { Btn, Card, Field, Input, Select } from '@/components/kit';

const CITIES: City[] = ['Lagos', 'Ilorin', 'Abuja', 'Other'];
const RELATIONSHIPS = ['Son', 'Daughter', 'Spouse', 'Sibling', 'Parent', 'Friend', 'Employer', 'Other'];

export default function SponsorOnboarding() {
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);
  const addProfile = useAuth((s) => s.addProfile);
  const setActiveProfile = useAuth((s) => s.setActiveProfile);
  const provisionSponsor = useStore((s) => s.provisionSponsor);
  const provisionLinkedPatient = useStore((s) => s.provisionLinkedPatient);
  const switchRole = useStore((s) => s.switchRole);

  const [name, setName] = useState(session?.account.name ?? '');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [currency, setCurrency] = useState('NGN (₦)');
  const [patientName, setPatientName] = useState('');
  const [relationship, setRelationship] = useState('Son');
  const [patientCity, setPatientCity] = useState<City>('Lagos');
  const [tier, setTier] = useState<PackageTier>('family');
  const [requestedLevel, setRequestedLevel] = useState<AccessLevel>('payment_only');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const sponsorAccountId = provisionSponsor({ name, phone });
      await addProfile('sponsor', sponsorAccountId);
      if (patientName.trim()) {
        provisionLinkedPatient({ sponsorAccountId, sponsorName: name, patientName: patientName.trim(), relationship, city: patientCity, tier, requestedLevel });
      }
      setActiveProfile('sponsor');
      switchRole('sponsor');
      await saveNow();
      navigate('/sponsor');
    } catch {
      setError('Could not save your Sponsor profile. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Set up your Sponsor profile</h1>
        <p className="text-sm text-slate-500 mb-6">Support or pay for someone&apos;s care — locally or from abroad. The patient stays in control of their information.</p>
        <form onSubmit={submit}>
          <Card className="space-y-3.5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">About you</p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Full name"><Input required value={name} onChange={(e) => setName(e.target.value)} aria-label="Full name" /></Field>
              <Field label="Email"><Input value={session?.account.email ?? ''} readOnly aria-label="Email" /></Field>
              <Field label="Phone"><Input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone" placeholder="+234 … / +1 …" /></Field>
              <Field label="Country of residence">
                <Select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country of residence">
                  {['Nigeria', 'United Kingdom', 'United States', 'Canada', 'Other'].map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Preferred currency">
                <Select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Preferred currency">
                  {['NGN (₦)', 'GBP (£)', 'USD ($)', 'CAD ($)'].map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>
          </Card>

          <Card className="space-y-3.5 mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Add or invite a patient (optional now — required before paying)</p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Patient name"><Input value={patientName} onChange={(e) => setPatientName(e.target.value)} aria-label="Patient name" placeholder="Who are you supporting?" /></Field>
              <Field label="Your relationship">
                <Select value={relationship} onChange={(e) => setRelationship(e.target.value)} aria-label="Your relationship">
                  {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Patient city">
                <Select value={patientCity} onChange={(e) => setPatientCity(e.target.value as City)} aria-label="Patient city">
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Package / payment intention" hint="Not billed in this UAT build.">
                <Select value={tier} onChange={(e) => setTier(e.target.value as PackageTier)} aria-label="Package or payment intention">
                  {PACKAGES.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.tagline}</option>)}
                </Select>
              </Field>
            </div>
          </Card>

          <Card className="space-y-3.5 mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Requested access level</p>
            <Field label="What would you like to see?" hint="Starts as payment-only until the patient approves more.">
              <Select value={requestedLevel} onChange={(e) => setRequestedLevel(e.target.value as AccessLevel)} aria-label="Requested access level">
                {ACCESS_LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label} — {l.description}</option>)}
              </Select>
            </Field>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-slate-700">
              <span className="font-bold">The patient decides what health information you may access.</span> Paying for care does not automatically provide health-information access.
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <div className="flex gap-2">
              <Btn type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create Sponsor profile'}</Btn>
              <Btn variant="secondary" onClick={() => navigate('/onboarding/choose')}>Back</Btn>
            </div>
          </Card>
        </form>
      </div>
    </PublicShell>
  );
}
