// Guided tour: 5 role-specific steps shown after first login, restartable from the demo toolbar.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import type { Role } from '@/types';
import { useAuth } from '@/store/auth';
import { Btn } from '@/components/kit';

export interface TourStep { title: string; text: string; to?: string }

const TOURS: Record<Role, TourStep[]> = {
  sponsor: [
    { title: 'Add or select a patient', text: 'Open People I Support to link a patient or pick who you are managing right now. Switching patients updates every page.', to: '/sponsor/people' },
    { title: 'Review the package', text: 'Plan & Services shows the package for the selected patient — upgrade, schedule a downgrade, pause, or manage add-ons.', to: '/sponsor/plan' },
    { title: 'Request access', text: 'Access Requests lets you ask for a higher access level. The patient always decides — paying never grants health information by itself.', to: '/sponsor/access' },
    { title: 'Select a verified CHW', text: 'Care Team compares verified CHWs for the patient — distance, rating, reliability and approved services.', to: '/sponsor/team' },
    { title: 'Review visits and alerts', text: 'Visits and Alerts show service delivery within your approved access level. Restricted details stay masked.', to: '/sponsor/visits' },
  ],
  patient: [
    { title: 'Review your plan', text: 'Plan & Services shows your package, what it includes, and add-ons available in your city.', to: '/patient/plan' },
    { title: 'Choose your CHW', text: 'Find a CHW compares verified workers near you. You choose — and you can reject or block anyone.', to: '/patient/find-chw' },
    { title: 'Approve family access', text: 'Permissions is where you approve, reduce or reject what sponsors and family may see. You are always in control.', to: '/patient/permissions' },
    { title: 'Confirm visits', text: 'Visits lists upcoming and completed visits — confirm them, reschedule, or dispute anything that looks wrong.', to: '/patient/visits' },
    { title: 'Submit feedback or a complaint', text: 'After a visit you can rate your CHW, and Complaints is always open if something needs attention.', to: '/patient/complaints' },
  ],
  chw: [
    { title: 'Review your assignments', text: 'Assignments shows new offers. Accept the ones you can cover — patients are matched inside your service area.', to: '/chw/assignments' },
    { title: 'Check in on arrival', text: 'Active Visit starts with GPS check-in at the patient address, with manual fallback when signal is poor.', to: '/chw/active-visit' },
    { title: 'Verify the patient', text: 'Before any service, verify identity — OTP to the patient phone or an approved manual method.', to: '/chw/active-visit' },
    { title: 'Record services and notes', text: 'Complete the checklist, record vitals (abnormal values must be repeated), and add observations.', to: '/chw/active-visit' },
    { title: 'Obtain confirmation and check out', text: 'The patient confirms the visit before you check out and submit. Records sync even after offline work.', to: '/chw/active-visit' },
  ],
  admin: [
    { title: 'Review the urgent queue', text: 'Operations surfaces escalated alerts and anything needing a human decision first. AI flags — humans decide.', to: '/admin' },
    { title: 'Process CHW applications', text: 'CHW Applications moves applicants through identity, qualification, references and training stages before activation.', to: '/admin/chw-applications' },
    { title: 'Approve services and rates', text: 'Service Approvals and Rate Cards control what CHWs may offer and charge. Rate-change requests land here.', to: '/admin/approvals' },
    { title: 'Handle complaints', text: 'Complaints tracks every case from intake to resolution with severity, notes and outcomes.', to: '/admin/complaints' },
    { title: 'Watch visit-quality flags', text: 'Data Quality lists flagged visits — repeated vitals, missing confirmations, GPS anomalies — for review.', to: '/admin/quality' },
  ],
  clinician: [
    { title: 'Open the review queue', text: 'Review Queue lists cases routed to you — abnormal escalations and referrals needing clinical judgement.', to: '/clinician' },
    { title: 'Read flagged cases', text: 'Flagged Cases groups patients with AI-flagged anomalies awaiting a human clinical decision.', to: '/clinician/cases' },
    { title: 'Review the case detail', text: 'Open a case to see the vitals trend, visit history and the reason it was flagged.', to: '/clinician/cases' },
    { title: 'Write two summaries', text: 'Your recommendation produces a clinical summary for the care team and a plain-language one for approved family.', to: '/clinician' },
    { title: 'Set your availability', text: 'Availability controls whether new cases are routed to you in this demo.', to: '/clinician/availability' },
  ],
};

export default function GuidedTour({ role }: { role: Role }) {
  const navigate = useNavigate();
  const session = useAuth((s) => s.session);
  const tourSeen = useAuth((s) => s.tourSeen);
  const markTourSeen = useAuth((s) => s.markTourSeen);
  const key = `${session?.account.id ?? 'anon'}:${role}`;
  const seen = tourSeen[key];
  const steps = useMemo(() => TOURS[role], [role]);
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // Restart (from the demo toolbar) flips `seen` back to false → show again from step 1.
  useEffect(() => { if (!seen) { setStep(0); setDismissed(false); } }, [key, seen]);

  if (dismissed || seen) return null;
  const current = steps[step];
  const last = step === steps.length - 1;
  const finish = () => { markTourSeen(key); setDismissed(true); };

  return (
    // On mobile the fixed mc-mobilebar (~64px) would overlap this card — lift it above the bar.
    <div className="fixed inset-x-0 bottom-[76px] md:bottom-0 z-40 p-4 pointer-events-none flex justify-center" role="dialog" aria-label="Guided tour">
      <div className="pointer-events-auto w-full max-w-md mc-card shadow-xl border-2" style={{ borderColor: 'var(--accent, var(--blue))' }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--accent-ink, var(--blue))' }}>
              Guided tour · step {step + 1} of {steps.length}
            </p>
            <p className="text-base font-extrabold text-slate-900 mt-0.5">{current.title}</p>
          </div>
          <button type="button" aria-label="Close tour" className="text-slate-400 hover:text-slate-600" onClick={finish}>
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-slate-600 mt-2">{current.text}</p>
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full ${i === step ? 'w-5' : 'w-1.5'}`} style={{ background: i === step ? 'var(--accent, var(--blue))' : '#e2e8f0' }} />
            ))}
          </div>
          <div className="flex gap-2">
            {current.to && <Btn variant="secondary" size="sm" onClick={() => { navigate(current.to!); }}>Go there</Btn>}
            {last
              ? <Btn size="sm" onClick={finish}>Finish tour</Btn>
              : <Btn size="sm" onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}>Next</Btn>}
          </div>
        </div>
        <button type="button" className="text-xs text-slate-400 underline mt-2" onClick={finish}>Skip tour</button>
      </div>
    </div>
  );
}
