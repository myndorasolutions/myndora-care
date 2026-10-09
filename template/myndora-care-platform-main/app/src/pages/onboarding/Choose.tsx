// Onboarding chooser: "What would you like to do first?" — patient, sponsor, or CHW application.
// Admin is never offered here; staff profiles are created internally only.
import { useNavigate } from 'react-router-dom';
import { HeartHandshake, UserRound, Stethoscope } from 'lucide-react';
import { useAuth } from '@/store/auth';
import PublicShell from '../public/PublicShell';
import { Card } from '@/components/kit';

const OPTIONS = [
  {
    to: '/onboarding/patient',
    icon: UserRound,
    title: 'Manage care for myself',
    hint: 'Create a Patient profile — choose a package available in your city and control who sees your information.',
  },
  {
    to: '/onboarding/sponsor',
    icon: HeartHandshake,
    title: 'Support or pay for someone\u2019s care',
    hint: 'Create a Sponsor profile — link a patient, pay for a package, and request the access level you need.',
  },
  {
    to: '/onboarding/chw',
    icon: Stethoscope,
    title: 'Apply as a Community Health Worker',
    hint: 'Start a verified CHW application — identity, qualification and reference checks before activation.',
  },
];

export default function Choose() {
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);

  return (
    <PublicShell>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">What would you like to do first?</h1>
        <p className="text-sm text-slate-500 mb-6">
          Welcome{session ? `, ${session.account.name}` : ''}. One account can hold several approved profiles over time — you can add another later from Account Settings.
        </p>
        <div className="space-y-3">
          {OPTIONS.map((o) => (
            <button key={o.to} type="button" onClick={() => navigate(o.to)} className="w-full text-left">
              <Card className="flex items-start gap-4 hover:border-[var(--accent)] transition-colors cursor-pointer">
                <span className="w-11 h-11 rounded-xl grid place-items-center text-white shrink-0" style={{ background: 'linear-gradient(135deg,#1687ff,#19c6b2)' }}>
                  <o.icon size={20} aria-hidden />
                </span>
                <span>
                  <span className="block text-base font-extrabold text-slate-900">{o.title}</span>
                  <span className="block text-sm text-slate-500 mt-0.5">{o.hint}</span>
                </span>
              </Card>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-5">Admin access is created internally by Myndora Care and can never be self-assigned.</p>
      </div>
    </PublicShell>
  );
}
