// Patient onboarding: collects the spec field list, provisions the patient world entity,
// and attaches a Patient profile to the signed-in account.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { City, PackageTier } from '@/types';
import { PACKAGES } from '@/lib/permissions';
import { useAuth } from '@/store/auth';
import { useStore } from '@/store/useStore';
import { saveNow } from '@/store/sync';
import PublicShell from '../public/PublicShell';
import { Btn, Card, Field, Input, Select, Toggle } from '@/components/kit';

const CITIES: City[] = ['Lagos', 'Ilorin', 'Abuja', 'Other'];
const LANGUAGES = ['English', 'Yoruba', 'Hausa', 'Igbo', 'Pidgin'];

export default function PatientOnboarding() {
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);
  const addProfile = useAuth((s) => s.addProfile);
  const setActiveProfile = useAuth((s) => s.setActiveProfile);
  const provisionPatient = useStore((s) => s.provisionPatient);
  const switchRole = useStore((s) => s.switchRole);

  const [name, setName] = useState(session?.account.name ?? '');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('English');
  const [city, setCity] = useState<City>('Lagos');
  const [address, setAddress] = useState('');
  const [locationOk, setLocationOk] = useState(true);
  const [tier, setTier] = useState<PackageTier>('basic');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [privacyOk, setPrivacyOk] = useState(false);
  const [supporterName, setSupporterName] = useState('');
  const [supporterEmail, setSupporterEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privacyOk) { setError('Please acknowledge the privacy and safety summary to continue.'); return; }
    setBusy(true); setError('');
    try {
      const patientId = provisionPatient({
        name, phone, language, city, address,
        tier, emergencyContact: emergencyName ? `${emergencyName} (${emergencyPhone || 'no phone'})` : undefined,
      });
      await addProfile('patient', patientId);
      setActiveProfile('patient');
      switchRole('patient');
      await saveNow();
      navigate('/patient');
    } catch {
      setError('Could not save your Patient profile. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Set up your Patient profile</h1>
        <p className="text-sm text-slate-500 mb-6">You control your information: family access, location use, and what sponsors may see are always your decision.</p>
        <form onSubmit={submit}>
          <Card className="space-y-3.5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">About you</p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Full name"><Input required value={name} onChange={(e) => setName(e.target.value)} aria-label="Full name" /></Field>
              <Field label="Date of birth"><Input required type="date" value={dob} onChange={(e) => setDob(e.target.value)} aria-label="Date of birth" /></Field>
              <Field label="Phone"><Input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone" placeholder="+234 …" /></Field>
              <Field label="Preferred language">
                <Select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Preferred language">
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
            </div>
          </Card>

          <Card className="space-y-3.5 mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Care location</p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="City">
                <Select value={city} onChange={(e) => setCity(e.target.value as City)} aria-label="City">
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Care address"><Input required value={address} onChange={(e) => setAddress(e.target.value)} aria-label="Care address" placeholder="Street, neighbourhood" /></Field>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Location permission</p>
                <p className="text-xs text-slate-500">Used to match CHWs and verify visits near your care address. You can change this anytime.</p>
              </div>
              <Toggle checked={locationOk} onChange={setLocationOk} label="Location permission" />
            </div>
          </Card>

          <Card className="space-y-3.5 mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Package available in {city}</p>
            <Field label="Monitoring package" hint="You can upgrade, downgrade or pause later. CHW visits depend on package and city availability.">
              <Select value={tier} onChange={(e) => setTier(e.target.value as PackageTier)} aria-label="Monitoring package">
                {PACKAGES.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.tagline}</option>)}
              </Select>
            </Field>
          </Card>

          <Card className="space-y-3.5 mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Emergency contact</p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Contact name"><Input required value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} aria-label="Emergency contact name" /></Field>
              <Field label="Contact phone"><Input required type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} aria-label="Emergency contact phone" /></Field>
            </div>
            <p className="text-xs text-slate-500">Myndora Care does not replace emergency services. In an emergency, call local emergency numbers first.</p>
          </Card>

          <Card className="space-y-3.5 mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Invite a supporter (optional)</p>
            <div className="grid sm:grid-cols-2 gap-3.5">
              <Field label="Supporter name"><Input value={supporterName} onChange={(e) => setSupporterName(e.target.value)} aria-label="Supporter name" placeholder="e.g. family member" /></Field>
              <Field label="Supporter email"><Input type="email" value={supporterEmail} onChange={(e) => setSupporterEmail(e.target.value)} aria-label="Supporter email" placeholder="They receive an invitation" /></Field>
            </div>
            <p className="text-xs text-slate-500">Invited supporters start with no health-information access — you approve their level from your portal.</p>
          </Card>

          <Card className="mt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1" checked={privacyOk} onChange={(e) => setPrivacyOk(e.target.checked)} aria-label="Privacy acknowledgement" />
              <span className="text-sm text-slate-700">
                <span className="font-bold">Privacy and safety acknowledgement.</span> I understand Myndora Care shares only the minimum necessary information with people I approve, keeps an audit log of access, and never grants health-information access just because someone pays for my care.
              </span>
            </label>
            {error && <p className="text-sm text-red-600 mt-3" role="alert">{error}</p>}
            <div className="flex gap-2 mt-4">
              <Btn type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create Patient profile'}</Btn>
              <Btn variant="secondary" onClick={() => navigate('/onboarding/choose')}>Back</Btn>
            </div>
          </Card>
        </form>
      </div>
    </PublicShell>
  );
}
