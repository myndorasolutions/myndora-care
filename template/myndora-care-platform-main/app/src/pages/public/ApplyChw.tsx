// Public CHW application entry — explains the pipeline, then routes into registration.
import { Link } from 'react-router-dom';
import InfoPage from './InfoPage';
import PublicShell from './PublicShell';
import { Btn, Card } from '@/components/kit';

export function ApplyChwPage() {
  return (
    <>
      <InfoPage
        title="Apply as a Community Health Worker"
        subtitle="Provide approved home visits and remote checks. Identity, qualifications, references, training, and service eligibility must be verified before activation."
        sections={[
          { type: 'steps', title: 'Application stages', steps: [
            { title: 'Application started', text: 'Create an account and submit your application with identity, qualification, and reference details.' },
            { title: 'Identity review', text: 'Our verification team checks your identity documents and NIN where applicable.' },
            { title: 'Qualification review', text: 'Qualifications, professional cadre, and registration details are verified.' },
            { title: 'References pending', text: 'Two professional references are contacted and recorded.' },
            { title: 'Training and approval', text: 'Required training is completed before approval for remote checks — and separately for home visits.' },
          ]},
          { type: 'checklist', title: 'What you will provide', items: [
            'A clear profile photo',
            'Legal name, email, and phone',
            'Identity information (NIN where applicable)',
            'City and service area',
            'Qualification, professional cadre, and registration details',
            'Years of experience and languages',
            'Two professional references',
            'Preferred service radius, availability, and requested services',
            'Consent to verification and background review',
          ]},
          { type: 'notice', title: 'Applicant access', text: 'While your application is in review you can track every stage from your applicant portal — but you cannot see patients, assignments, visit records, health information, or payouts until approved.' },
        ]}
        cta={[{ label: 'Start your application', to: '/register?intent=chw' }, { label: 'CHW Sign In', to: '/login?portal=chw' }]}
      />
    </>
  );
}

export function ApplyClinicianPage() {
  return (
    <PublicShell>
      <section className="mc-hero max-w-[1200px] mx-auto mt-6 md:mt-10 px-6 md:px-10 py-10 md:py-12" style={{ borderRadius: 24 }}>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight max-w-3xl">Clinician verification</h1>
        <p className="mt-3 text-white/85 max-w-2xl text-sm md:text-base">
          Clinicians review referred care cases on Myndora Care. Public self-registration never creates an approved clinician account — submit an expression of interest and our verification team will review your credentials.
        </p>
      </section>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 mt-8 mb-14 grid gap-6 lg:grid-cols-[1fr_380px]">
        <ClinicianEoiForm />
        <div className="space-y-4">
          <Card>
            <h2 className="mc-section-title mb-3">Verification stages</h2>
            <ol className="space-y-2 text-sm text-slate-600">
              {['Application submitted', 'Verification pending', 'Approved', 'Suspended or Rejected'].map((s, i) => (
                <li key={s} className="flex gap-2.5">
                  <span className="w-6 h-6 rounded-full grid place-items-center text-xs font-extrabold text-white shrink-0" style={{ background: 'var(--accent, var(--blue))' }}>{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-slate-400 mt-3">Your portal remains unavailable until Myndora Care verifies and activates your account. Clinicians may also be invited directly by Myndora Care or a partner organization.</p>
          </Card>
          <Card>
            <h2 className="mc-section-title mb-2">Already verified?</h2>
            <p className="text-sm text-slate-600 mb-3">Sign in with the email and password on your activated account.</p>
            <Link to="/login?portal=clinician"><Btn variant="secondary" className="w-full">Clinician Sign In</Btn></Link>
          </Card>
        </div>
      </div>
    </PublicShell>
  );
}

import { useState } from 'react';
import { api } from '@/lib/api';
import { Field, Input } from '@/components/kit';

function ClinicianEoiForm() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', category: 'Medical Doctor', registration: '',
    authority: '', qualification: '', speciality: '', experience: '', facility: '', documents: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.onboarding.submitClinicianApplication.mutate({
        name: form.name,
        email: form.email,
        payload: {
          phone: form.phone, category: form.category, registration: form.registration,
          authority: form.authority, qualification: form.qualification, speciality: form.speciality,
          experience: form.experience, facility: form.facility, documents: form.documents,
        },
      });
      setSent(true);
    } catch {
      setError('Could not submit your expression of interest. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Card className="text-center py-8" role="status">
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">Expression of interest received</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Thank you, {form.name.split(' ')[0]}. Your application status is <b>Application submitted</b>. Our verification team will review your credentials and contact you at <b>{form.email}</b>. Your clinician portal remains unavailable until your account is verified and activated.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mc-section-title mb-1">Submit an expression of interest</h2>
      <p className="text-sm text-slate-500 mb-4">All fields support verification. Supporting documents are checked by staff, never shown to patients.</p>
      <form onSubmit={submit} className="grid gap-3.5 md:grid-cols-2">
        <Field label="Legal name"><Input required value={form.name} onChange={set('name')} aria-label="Legal name" /></Field>
        <Field label="Email"><Input type="email" required value={form.email} onChange={set('email')} aria-label="Email" /></Field>
        <Field label="Phone"><Input required value={form.phone} onChange={set('phone')} aria-label="Phone" /></Field>
        <Field label="Professional category">
          <select className="mc-input" value={form.category} onChange={set('category')} aria-label="Professional category">
            {['Medical Doctor', 'Nurse Practitioner', 'Physician Assistant', 'Pharmacist', 'Other'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Registration number"><Input required value={form.registration} onChange={set('registration')} aria-label="Registration number" /></Field>
        <Field label="Licensing authority"><Input required value={form.authority} onChange={set('authority')} aria-label="Licensing authority" placeholder="e.g. MDCN" /></Field>
        <Field label="Qualification"><Input required value={form.qualification} onChange={set('qualification')} aria-label="Qualification" placeholder="e.g. MBBS, FWACP" /></Field>
        <Field label="Speciality"><Input required value={form.speciality} onChange={set('speciality')} aria-label="Speciality" placeholder="e.g. Family Medicine" /></Field>
        <Field label="Years of experience"><Input required inputMode="numeric" value={form.experience} onChange={set('experience')} aria-label="Years of experience" /></Field>
        <Field label="Facility or organization"><Input required value={form.facility} onChange={set('facility')} aria-label="Facility or organization" /></Field>
        <Field label="Supporting documents (reference)">
          <Input value={form.documents} onChange={set('documents')} aria-label="Supporting documents" placeholder="e.g. Licence scan, certificate references" />
        </Field>
        {error && <p className="text-sm text-red-600 md:col-span-2" role="alert">{error}</p>}
        <div className="md:col-span-2">
          <Btn type="submit" className="w-full" disabled={busy}>{busy ? 'Submitting…' : 'Submit expression of interest'}</Btn>
        </div>
      </form>
    </Card>
  );
}
