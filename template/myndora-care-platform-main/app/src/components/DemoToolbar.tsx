// UAT demo toolbar — visible ONLY for seeded demo accounts, never in production use.
// Provides: current role, switch demo role, reset demo data, restart tour, view scenario, report issue.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';
import type { DemoRole } from '@contracts/types';
import { DEMO_ACCOUNTS } from '@contracts/types';
import type { Role } from '@/types';
import { useAuth } from '@/store/auth';
import { enterSession } from '@/store/session';
import { useStore } from '@/store/useStore';
import { saveNow } from '@/store/sync';
import { useModal, useToast } from '@/store/ui';
import { Btn, Textarea } from '@/components/kit';

const ROLE_LABEL: Record<Role, string> = { sponsor: 'Sponsor', patient: 'Patient', chw: 'CHW', admin: 'Admin', clinician: 'Clinician' };

const SCENARIOS: Record<Role, string[]> = {
  sponsor: [
    '1. Switch between Grace, Bola and Kunle — every page follows the selected patient.',
    '2. Upgrade Grace\u2019s package to Premium Family Care in Plan & Services.',
    '3. Open Bola Adeyemi — confirm payment-only access shows no health information.',
    '4. Request urgent-alert access for Kunle from Access Requests.',
    '7. Compare CHWs in Care Team and choose one for Grace.',
    '18. Switch profile between Sponsor and Patient (Tunde holds both).',
  ],
  patient: [
    '5. Approve, reduce, then reject a sponsor access request in Permissions.',
    '6. Find a CHW: compare, choose one, then reject another.',
    '8. Confirm the upcoming visit in Visits.',
    '9. Submit a complaint about a visit and watch it in Complaints.',
    '15. Rate a completed visit from the Visits page.',
  ],
  chw: [
    '14. Accept the pending assignment offer for Grace.',
    '14b. Run the full visit: check in → verify patient → record services → patient confirmation → check out → submit.',
    '16. Request a new service or rate change in Services & Rates.',
    '19. Go offline in Offline Queue, record work, then sync.',
  ],
  admin: [
    '12. CHW Applications: advance the new applicant to approved for remote checks.',
    '13. Advance the same applicant to approved for home visits.',
    '17. Approve the pending rate-change request in Service Approvals.',
    '20. Review Data Quality flags and mark one reviewed.',
    '11. Handle the urgent escalated alert from the Alert Queue.',
  ],
  clinician: [
    '10. Open the review queue and resolve a flagged case with two summaries.',
    '10b. Toggle availability and confirm routing pauses.',
  ],
};

export default function DemoToolbar({ role }: { role: Role }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openModal, closeModal } = useModal();
  const session = useAuth((s) => s.session);
  const demoLogin = useAuth((s) => s.demoLogin);
  const activeProfile = useAuth((s) => s.activeProfile);
  const resetTour = useAuth((s) => s.resetTour);
  const resetDemo = useStore((s) => s.resetDemo);
  const logAudit = useStore((s) => s.logAudit);
  const [open, setOpen] = useState(false);
  const [issue, setIssue] = useState('');
  const [busy, setBusy] = useState(false);

  if (!session?.account.isDemo) return null;

  const switchDemoRole = async (r: DemoRole) => {
    setBusy(true);
    try {
      const s = await demoLogin(r);
      await enterSession(s, navigate);
    } finally {
      setBusy(false);
    }
  };

  const restartTour = () => {
    resetTour(`${session.account.id}:${role}`);
    toast('Guided tour restarted');
  };

  const viewScenario = () => {
    openModal({
      title: `UAT test scenarios — ${ROLE_LABEL[role]}`,
      body: (
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-600">
          {SCENARIOS[role].map((s) => <li key={s}>{s}</li>)}
        </ol>
      ),
      footer: <Btn onClick={closeModal}>Close</Btn>,
    });
  };

  const reportIssue = () => {
    setIssue('');
    openModal({
      title: 'Report a prototype issue',
      body: (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">Describe what you expected and what happened. Recorded against this UAT session.</p>
          <Textarea aria-label="Issue description" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="e.g. The Confirm button on the visits page did nothing on mobile…" />
        </div>
      ),
      footer: (
        <>
          <Btn variant="secondary" onClick={closeModal}>Cancel</Btn>
          <Btn onClick={() => {
            if (issue.trim()) logAudit(session.account.name, role, 'uat.issue_reported', issue.trim().slice(0, 120));
            closeModal();
            toast('Issue recorded — thank you');
          }}>Submit issue</Btn>
        </>
      ),
    });
  };

  return (
    <div className="fixed bottom-16 md:bottom-4 right-3 z-40 w-[calc(100vw-1.5rem)] max-w-sm" data-testid="demo-toolbar">
      <div className="mc-card border-2 border-dashed border-amber-300 bg-amber-50/95 backdrop-blur p-0 overflow-hidden shadow-lg">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle UAT demo toolbar"
        >
          <span className="inline-flex items-center gap-2 text-xs font-extrabold text-amber-800">
            <FlaskConical size={15} /> UAT demo · testing as {ROLE_LABEL[role]}
            {activeProfile === 'chw_applicant' ? ' (applicant)' : ''}
          </span>
          {open ? <ChevronDown size={15} className="text-amber-700" /> : <ChevronUp size={15} className="text-amber-700" />}
        </button>
        {open && (
          <div className="px-3 pb-3 space-y-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-1">Switch demo role</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(DEMO_ACCOUNTS) as DemoRole[]).map((r) => (
                  <Btn key={r} variant="secondary" size="sm" disabled={busy} onClick={() => switchDemoRole(r)}>
                    {r === 'chw' ? 'CHW' : r[0].toUpperCase() + r.slice(1)}
                  </Btn>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Btn variant="secondary" size="sm" onClick={async () => { resetDemo(); await saveNow(); toast('Demo data restored'); }}>Reset demo data</Btn>
              <Btn variant="secondary" size="sm" onClick={restartTour}>Restart guided tour</Btn>
              <Btn variant="secondary" size="sm" onClick={viewScenario}>View test scenario</Btn>
              <Btn variant="secondary" size="sm" onClick={reportIssue}>Report prototype issue</Btn>
            </div>
            <Btn variant="danger" size="sm" className="w-full" onClick={async () => { await saveNow(); await useAuth.getState().logout(); navigate('/'); }}>Exit demo</Btn>
            <p className="text-[11px] text-amber-700">Demo toolbar is only shown for seeded UAT accounts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
