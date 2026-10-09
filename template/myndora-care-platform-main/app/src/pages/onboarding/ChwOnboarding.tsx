// CHW application onboarding: full verification intake per spec.
// Submits the application (stage: identity review) and attaches a chw_applicant profile.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { City } from '@/types';
import { useAuth } from '@/store/auth';
import { api } from '@/lib/api';
import PublicShell from '../public/PublicShell';
import { Btn, Card, Field, Input, Select } from '@/components/kit';

const CITIES: City[] = ['Lagos', 'Ilorin', 'Abuja', 'Other'];
const CADRES = ['CHEW', 'Nurse', 'Midwife', 'Community Health Officer', 'Other'];
const SERVICE_OPTIONS = ['Remote checks', 'Home visits', 'Medication follow-up', 'Vitals recording', 'Wound care', 'Health education'];
const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LANGUAGE_OPTIONS = ['English', 'Yoruba', 'Hausa', 'Igbo', 'Pidgin'];

export default function ChwOnboarding() {
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);
  const addProfile = useAuth((s) => s.addProfile);
  const setActiveProfile = useAuth((s) => s.setActiveProfile);

  const [photoName, setPhotoName] = useState('');
  const [legalName, setLegalName] = useState(session?.account.name ?? '');
  const [phone, setPhone] = useState('');
  const [nin, setNin] = useState('');
  const [city, setCity] = useState<City>('Ilorin');
  const [serviceArea, setServiceArea] = useState('');
  const [qualification, setQualification] = useState('');
  const [cadre, setCadre] = useState('CHEW');
  const [registration, setRegistration] = useState('');
  const [experience, setExperience] = useState('1');
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [ref1Name, setRef1Name] = useState(''); const [ref1Phone, setRef1Phone] = useState('');
  const [ref2Name, setRef2Name] = useState(''); const [ref2Phone, setRef2Phone] = useState('');
  const [radius, setRadius] = useState('5');
  const [availability, setAvailability] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [services, setServices] = useState<string[]>(['Remote checks']);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleIn = (list: string[], v: string, set: (x: string[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setError('Please consent to identity, qualification, reference and background checks to apply.'); return; }
    if (services.length === 0) { setError('Select at least one requested service.'); return; }
    setBusy(true); setError('');
    try {
      await addProfile('chw_applicant', null);
      await api.onboarding.submitChwApplication.mutate({
        applicantName: legalName,
        city,
        payload: {
          photoName, phone, nin, serviceArea, qualification, cadre, registration,
          yearsExperience: Number(experience) || 0, languages, radiusKm: Number(radius) || 5,
          availability, requestedServices: services,
          references: [
            { name: ref1Name, phone: ref1Phone },
            { name: ref2Name, phone: ref2Phone },
          ],
          consentToChecks: consent,
        },
      });
      setActiveProfile('chw_applicant');
      navigate('/applicant');
    } catch {
      setError('Could not submit your application. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Community Health Worker application</h1>
        <p className="text-sm text-slate-500 mb-6">Verified CHWs complete identity, qualification and reference checks plus training before activation. You can track every stage from your applicant portal.</p>
        <form onSubmit={submit}>
          <Card className="space-y-3.5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Identity</p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Profile photo" hint={photoName ? `Selected: ${photoName}` : 'A clear headshot. Stored as a file reference in this UAT build.'}>
                <Input type="file" accept="image/*" onChange={(e) => setPhotoName(e.target.files?.[0]?.name ?? '')} aria-label="Profile photo" />
              </Field>
              <Field label="Legal name (as on ID)"><Input required value={legalName} onChange={(e) => setLegalName(e.target.value)} aria-label="Legal name" /></Field>
              <Field label="Phone"><Input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone" placeholder="+234 …" /></Field>
              <Field label="Email"><Input value={session?.account.email ?? ''} readOnly aria-label="Email" /></Field>
              <Field label="National Identification Number (NIN)"><Input required value={nin} onChange={(e) => setNin(e.target.value)} aria-label="NIN" placeholder="11-digit NIN" pattern="[0-9]{11}" title="11-digit NIN" /></Field>
            </div>
          </Card>

          <Card className="space-y-3.5 mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Qualifications</p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Cadre">
                <Select value={cadre} onChange={(e) => setCadre(e.target.value)} aria-label="Cadre">
                  {CADRES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Qualification"><Input required value={qualification} onChange={(e) => setQualification(e.target.value)} aria-label="Qualification" placeholder="e.g. CHEW diploma, School of Health" /></Field>
              <Field label="Registration / licence number"><Input required value={registration} onChange={(e) => setRegistration(e.target.value)} aria-label="Registration number" /></Field>
              <Field label="Years of experience"><Input required type="number" min="0" max="50" value={experience} onChange={(e) => setExperience(e.target.value)} aria-label="Years of experience" /></Field>
            </div>
            <Field label="Languages">
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((l) => (
                  <label key={l} className={`rounded-full border px-3 py-1 text-sm cursor-pointer ${languages.includes(l) ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold' : 'border-slate-200'}`}>
                    <input type="checkbox" className="sr-only" checked={languages.includes(l)} onChange={() => toggleIn(languages, l, setLanguages)} aria-label={`Language ${l}`} />
                    {l}
                  </label>
                ))}
              </div>
            </Field>
          </Card>

          <Card className="space-y-3.5 mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Service area and availability</p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="City">
                <Select value={city} onChange={(e) => setCity(e.target.value as City)} aria-label="City">
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Service area (neighbourhoods)"><Input required value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} aria-label="Service area" placeholder="e.g. Tanke, Fate, GRA" /></Field>
              <Field label="Travel radius (km)"><Input required type="number" min="1" max="50" value={radius} onChange={(e) => setRadius(e.target.value)} aria-label="Travel radius" /></Field>
            </div>
            <Field label="Available days">
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((d) => (
                  <label key={d} className={`rounded-full border px-3 py-1 text-sm cursor-pointer ${availability.includes(d) ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold' : 'border-slate-200'}`}>
                    <input type="checkbox" className="sr-only" checked={availability.includes(d)} onChange={() => toggleIn(availability, d, setAvailability)} aria-label={`Available ${d}`} />
                    {d}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Requested services">
              <div className="flex flex-wrap gap-2">
                {SERVICE_OPTIONS.map((s) => (
                  <label key={s} className={`rounded-full border px-3 py-1 text-sm cursor-pointer ${services.includes(s) ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold' : 'border-slate-200'}`}>
                    <input type="checkbox" className="sr-only" checked={services.includes(s)} onChange={() => toggleIn(services, s, setServices)} aria-label={`Service ${s}`} />
                    {s}
                  </label>
                ))}
              </div>
            </Field>
          </Card>

          <Card className="space-y-3.5 mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Two references</p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Reference 1 name"><Input required value={ref1Name} onChange={(e) => setRef1Name(e.target.value)} aria-label="Reference 1 name" /></Field>
              <Field label="Reference 1 phone"><Input required type="tel" value={ref1Phone} onChange={(e) => setRef1Phone(e.target.value)} aria-label="Reference 1 phone" /></Field>
              <Field label="Reference 2 name"><Input required value={ref2Name} onChange={(e) => setRef2Name(e.target.value)} aria-label="Reference 2 name" /></Field>
              <Field label="Reference 2 phone"><Input required type="tel" value={ref2Phone} onChange={(e) => setRef2Phone(e.target.value)} aria-label="Reference 2 phone" /></Field>
            </div>
          </Card>

          <Card className="mt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-label="Consent to checks" />
              <span className="text-sm text-slate-700">
                <span className="font-bold">Consent to verification checks.</span> I consent to identity, qualification, reference and background checks, and to completing required training before activation. I understand approval for remote checks and for home visits are separate stages.
              </span>
            </label>
            {error && <p className="text-sm text-red-600 mt-3" role="alert">{error}</p>}
            <div className="flex gap-2 mt-4">
              <Btn type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</Btn>
              <Btn variant="secondary" onClick={() => navigate('/onboarding/choose')}>Back</Btn>
            </div>
          </Card>
        </form>
      </div>
    </PublicShell>
  );
}
