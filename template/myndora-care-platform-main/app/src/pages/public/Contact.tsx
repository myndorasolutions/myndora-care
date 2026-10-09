// Public contact page — form submits to the backend and is stored for the UAT team.
import { useState } from 'react';
import PublicShell from './PublicShell';
import { api } from '@/lib/api';
import { Btn, Card, Field, Input, Textarea } from '@/components/kit';

const TOPICS = ['General question', 'Patient or sponsor support', 'CHW application', 'Clinician verification', 'Partnership enquiry', 'Report a concern'];

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.contact.submit.mutate({ name, email, topic, message });
      setSent(true);
    } catch {
      setError('Could not send your message. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell>
      <div className="max-w-md mx-auto px-4 py-10">
        <Card>
          {sent ? (
            <div className="text-center py-4" role="status">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-2">Message received</h1>
              <p className="text-sm text-slate-600">Thank you, {name.split(' ')[0]}. The Myndora Care team will review your message about <b>{topic.toLowerCase()}</b> and respond to <b>{email}</b>.</p>
              <Btn variant="secondary" className="mt-5" onClick={() => { setSent(false); setName(''); setEmail(''); setMessage(''); }}>Send another message</Btn>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">Contact Myndora Care</h1>
              <p className="text-sm text-slate-500 mb-5">Questions about care, applications, verification, or partnerships — send us a message.</p>
              <form onSubmit={submit} className="space-y-3.5">
                <Field label="Full name">
                  <Input required value={name} onChange={(e) => setName(e.target.value)} aria-label="Full name" autoComplete="name" />
                </Field>
                <Field label="Email">
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" autoComplete="email" />
                </Field>
                <Field label="Topic">
                  <select className="mc-input" value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Topic">
                    {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Message">
                  <Textarea required minLength={10} rows={4} value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Message" placeholder="How can we help?" />
                </Field>
                {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
                <Btn type="submit" className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</Btn>
              </form>
              <p className="text-xs text-slate-400 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                Myndora Care does not replace emergency medical services. For a life-threatening emergency, contact the appropriate emergency service or go to the nearest qualified medical facility.
              </p>
            </>
          )}
        </Card>
      </div>
    </PublicShell>
  );
}
