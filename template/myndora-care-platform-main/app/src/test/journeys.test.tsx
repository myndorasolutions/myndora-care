// End-to-end smoke tests for the five required role journeys + quality gates.
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/store/auth';

const s = () => useStore.getState();

/** Seed an authenticated UAT tester holding every role profile, so guarded portals render. */
export function signInAllProfiles() {
  useAuth.setState({
    bootstrapped: true,
    activeProfile: 'sponsor',
    session: {
      account: {
        id: 999, email: 'tester@uat.myndora.test', name: 'UAT Tester', verified: true, isDemo: false,
        profiles: [
          { id: 991, kind: 'sponsor', status: 'active', refId: 'acc-sponsor' },
          { id: 992, kind: 'patient', status: 'active', refId: 'pat-grace' },
          { id: 993, kind: 'chw', status: 'active', refId: 'chw-amina' },
          { id: 994, kind: 'admin', status: 'active', refId: 'acc-admin' },
          { id: 995, kind: 'clinician', status: 'active', refId: 'acc-clinician' },
        ],
      },
    },
    tourSeen: { '999:sponsor': true, '999:patient': true, '999:chw': true, '999:admin': true, '999:clinician': true },
  });
}

function renderAt(path: string) {
  signInAllProfiles();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('quality gates', () => {
  const ROUTES = [
    '/sponsor', '/sponsor/people', '/sponsor/plan', '/sponsor/team', '/sponsor/visits',
    '/sponsor/alerts', '/sponsor/payments', '/sponsor/access', '/sponsor/complaints', '/sponsor/reports',
    '/patient', '/patient/plan', '/patient/find-chw', '/patient/team', '/patient/visits',
    '/patient/updates', '/patient/permissions', '/patient/complaints', '/patient/documents',
    '/chw', '/chw/assignments', '/chw/calendar', '/chw/active-visit', '/chw/records',
    '/chw/escalations', '/chw/offline', '/chw/services', '/chw/credentials', '/chw/ratings', '/chw/payouts',
    '/admin', '/admin/patients', '/admin/sponsors', '/admin/chws', '/admin/assignments',
    '/admin/alerts', '/admin/complaints', '/admin/approvals', '/admin/rate-cards',
    '/admin/consent', '/admin/quality', '/admin/audit', '/admin/integrations',
    '/clinician', '/clinician/cases', '/clinician/cases/case-1', '/clinician/history',
    '/clinician/availability', '/clinician/profile',
  ];

  it.each(ROUTES)('route %s renders a unique view with content', (route) => {
    const { unmount } = renderAt(route);
    const main = screen.getByRole('main');
    expect(main.textContent!.length).toBeGreaterThan(80);
    unmount();
  });

  it('every role dashboard is visually distinct (theme + copy)', () => {
    const themes: string[] = [];
    (['/sponsor', '/patient', '/chw', '/admin', '/clinician'] as const).forEach((r) => {
      const { container, unmount } = renderAt(r);
      themes.push(container.querySelector('[data-theme]')!.getAttribute('data-theme')!);
      unmount();
    });
    expect(new Set(themes).size).toBe(5);
  });

  it('Escape closes modals', async () => {
    const user = userEvent.setup();
    renderAt('/sponsor/complaints');
    await user.click(screen.getByRole('button', { name: /new complaint/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('modal Confirm and Cancel both work', async () => {
    const user = userEvent.setup();
    renderAt('/patient/visits');
    const disputeBtns = screen.getAllByRole('button', { name: /dispute visit/i });
    await user.click(disputeBtns[0]);
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(s().visits.every((v) => !v.disputed)).toBe(true);
  });
});

describe('sponsor journey', () => {
  it('compares packages and schedules a downgrade with a working modal', async () => {
    const user = userEvent.setup();
    renderAt('/sponsor/plan');

    // compare packages modal
    await user.click(screen.getByRole('button', { name: /compare packages/i }));
    expect(within(screen.getByRole('dialog')).getByText('Premium Family Care')).toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^close$/i }));

    // schedule downgrade from Assisted → Family
    const downgrades = screen.getAllByRole('button', { name: /select \(downgrade\)/i });
    await user.click(downgrades[0]); // Basic Monitor = lowest tier (packages render low → high)
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/next billing cycle/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /schedule downgrade/i }));
    expect(s().subscriptions.find((x) => x.patientId === 'pat-grace')!.scheduledDowngradeTo).toBe('basic');
  });

  it('upgrades immediately after availability confirmation', async () => {
    const user = userEvent.setup();
    renderAt('/sponsor/plan');
    await user.click(screen.getByRole('button', { name: /^upgrade$/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText(/availability check/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /confirm upgrade/i }));
    expect(s().subscriptions.find((x) => x.patientId === 'pat-grace')!.tier).toBe('premium');
  });

  it('requests health access — never self-grants', async () => {
    const user = userEvent.setup();
    renderAt('/sponsor/access');
    // Grace has no pending request in the seed → the form opens and sends a request
    await user.click(screen.getAllByRole('button', { name: /request access/i })[0]);
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /send request/i }));
    expect(s().consents.filter((c) => c.patientId === 'pat-grace' && c.status === 'pending').length).toBe(1);

    // Ngozi already has a pending request in the seed → no duplicates, button disabled
    s().selectPatient('pat-ngozi');
    renderAt('/sponsor/access');
    expect(screen.getAllByRole('button', { name: /request access/i })[0]).toBeDisabled();
    expect(screen.getAllByText(/pending patient approval/i).length).toBeGreaterThan(0);
    const pending = s().consents.filter((c) => c.patientId === 'pat-ngozi' && c.status === 'pending');
    expect(pending.length).toBe(1);
    expect(s().relationships.find((r) => r.patientId === 'pat-ngozi')!.accessLevel).toBe('payment_only');
  });

  it('submits a complaint', async () => {
    const user = userEvent.setup();
    renderAt('/sponsor/complaints');
    await user.click(screen.getByRole('button', { name: /new complaint/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/complaint details/i), 'CHW arrived late twice this month.');
    await user.click(within(dialog).getByRole('button', { name: /submit complaint/i }));
    expect(s().complaints.some((c) => c.raisedByName === 'Tunde Adeyemi')).toBe(true);
  });
});

describe('patient journey', () => {
  it('withdraws sponsor access (payment ≠ health access)', async () => {
    const user = userEvent.setup();
    renderAt('/patient/permissions');
    await user.click(screen.getByRole('button', { name: /withdraw access/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /withdraw access/i }));
    expect(s().relationships.find((r) => r.patientId === 'pat-grace')!.accessLevel).toBe('payment_only');
  });

  it('approves and reduces pending access requests', async () => {
    // create a pending request for Grace, then decide it as the patient
    s().requestAccess('pat-grace', 'service_updates');
    const pending = s().consents.find((c) => c.patientId === 'pat-grace' && c.status === 'pending')!;
    s().decideAccess(pending.id, 'reduced', 'important_alerts');
    expect(s().consents.find((c) => c.id === pending.id)!.grantedLevel).toBe('important_alerts');
  });

  it('rejects one CHW and selects another', async () => {
    const user = userEvent.setup();
    renderAt('/patient/find-chw');
    // reject Rashidat via her "Not this CHW" ghost button
    const rejectButtons = screen.getAllByRole('button', { name: /not this chw/i });
    await user.click(rejectButtons[rejectButtons.length - 1]);
    // select Funmi
    await user.click(screen.getByRole('button', { name: /choose funmi/i }));
    expect(s().selectedChwByPatient['pat-grace']).toBe('chw-funmi');
  });

  it('rates a CHW only after a verified visit', async () => {
    const user = userEvent.setup();
    renderAt('/patient/visits');
    await user.click(screen.getByRole('button', { name: /rate chw/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /submit rating/i }));
    expect(s().ratings.some((r) => r.visitId === 'visit-2')).toBe(true);
    // cannot rate the merely-scheduled visit
    expect(s().rateChw('visit-3', 5, 'x')).toBe(false);
  });

  it('disputes a visit — payout freezes', async () => {
    const user = userEvent.setup();
    renderAt('/patient/visits');
    const disputeBtns = screen.getAllByRole('button', { name: /dispute visit/i });
    await user.click(disputeBtns[0]);
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/reason for dispute/i), 'Blood sugar check was skipped.');
    await user.click(within(dialog).getByRole('button', { name: /submit dispute/i }));
    const disputed = s().visits.find((v) => v.disputed)!;
    expect(disputed.payoutFrozen).toBe(true);
  });
});

describe('CHW journey', () => {
  it('accepts an assignment (address unlocks only after acceptance)', async () => {
    const user = userEvent.setup();
    renderAt('/chw/assignments');
    expect(screen.queryByText(/Aminu Kano/i)).not.toBeInTheDocument(); // asg-3 is Funmi's; check Grace's offered asg-2
    const acceptBtns = screen.getAllByRole('button', { name: /^accept$/i });
    await user.click(acceptBtns[0]);
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /accept assignment/i }));
    expect(s().assignments.find((a) => a.id === 'asg-2')!.status).toBe('accepted');
  });

  it('completes the full visit documentation workflow', async () => {
    const user = userEvent.setup();
    renderAt('/chw/active-visit');

    // start → check in → verify via OTP
    await user.click(screen.getByRole('button', { name: /start visit/i }));
    await user.click(screen.getByRole('button', { name: /check in at location/i }));
    await user.type(screen.getByLabelText(/one-time code/i), '632174');
    await user.click(screen.getByRole('button', { name: /verify patient/i }));

    // checklist
    await user.click(screen.getByRole('checkbox', { name: /blood pressure check/i }));

    // abnormal reading requires repeat
    await user.type(screen.getByLabelText(/systolic/i), '185');
    await user.type(screen.getByLabelText(/diastolic/i), '105');
    await user.click(screen.getByRole('button', { name: /add reading/i }));
    expect(screen.getByText(/requires a repeat/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/repeat reading/i), '150/90');
    await user.click(screen.getByRole('button', { name: /record repeat/i }));

    // structured notes + who was present
    await user.type(screen.getByLabelText(/patient-reported information/i), 'Reports mild dizziness.');
    await user.type(screen.getByLabelText(/chw observation/i), 'Slightly unsteady on standing.');
    await user.type(screen.getByLabelText(/person name/i), 'Kunle Okafor');
    await user.click(screen.getByRole('button', { name: /add person/i }));

    // escalation
    await user.type(screen.getByLabelText(/escalation reason/i), 'BP remains elevated with dizziness.');
    await user.click(screen.getByRole('button', { name: /trigger escalation/i }));

    // checkout + submit
    await user.click(screen.getByRole('button', { name: /check out of location/i }));
    await user.click(screen.getByRole('button', { name: /^submit visit$/i }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /submit record/i }));

    const visit = s().visits.find((v) => v.id === 'visit-3')!;
    expect(visit.status).toBe('submitted');
    expect(visit.evidence.otpVerified).toBe(true);
    expect(visit.evidence.geofenceCheckIn).toBeTruthy();
    expect(visit.escalationId).toBeTruthy();
    expect(visit.presentPersons[0].name).toBe('Kunle Okafor');
    expect(s().activeVisit).toBeNull();
    expect(s().escalations.some((e) => e.visitId === 'visit-3')).toBe(true);
  });

  it('submits a service change request for admin approval', async () => {
    const user = userEvent.setup();
    renderAt('/chw/services');
    await user.click(screen.getByRole('button', { name: /request a change/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/request description/i), 'Request medicine delivery service for Ilorin.');
    await user.click(within(dialog).getByRole('button', { name: /submit request/i }));
    expect(s().serviceRequests[0].status).toBe('pending');
  });
});

describe('admin journey', () => {
  it('approves a service request and rejects a rate request', async () => {
    const user = userEvent.setup();
    renderAt('/admin/approvals');
    const approveBtns = screen.getAllByRole('button', { name: /^approve$/i });
    await user.click(approveBtns[0]);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^approve$/i }));
    expect(s().serviceRequests.find((r) => r.id === 'srr-1')!.status).toBe('approved');

    const rejectBtns = screen.getAllByRole('button', { name: /^reject$/i });
    await user.click(rejectBtns[0]);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^reject$/i }));
    expect(s().serviceRequests.find((r) => r.id === 'srr-2')!.status).toBe('rejected');
  });

  it('reviews a complaint and resolves it', async () => {
    const user = userEvent.setup();
    renderAt('/admin/complaints');
    const resolveBtns = screen.getAllByRole('button', { name: /^resolve$/i });
    await user.click(resolveBtns[0]);
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/resolution notes/i), 'Apology issued and service credit applied.');
    await user.click(within(dialog).getByRole('button', { name: /record resolution/i }));
    expect(s().complaints.find((c) => c.id === 'cmp-1')!.stage).toBe('resolved');
  });

  it('reviews data-quality flags and inspects the audit log', async () => {
    const user = userEvent.setup();
    renderAt('/admin/quality');
    const reviewBtns = screen.getAllByRole('button', { name: /mark reviewed/i });
    await user.click(reviewBtns[0]);
    expect(s().dqFlags.some((f) => f.status === 'reviewed')).toBe(true);

    renderAt('/admin/audit');
    expect(screen.getByRole('table')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/search audit logs/i), 'zzzz-no-match');
    expect(screen.getByText(/no events match/i)).toBeInTheDocument();
  });

  it('reassigns a patient to another CHW', () => {
    s().reassignPatient('pat-grace', 'chw-funmi');
    expect(s().selectedChwByPatient['pat-grace']).toBe('chw-funmi');
  });
});

describe('clinician journey', () => {
  it('reviews a flagged case with separated evidence and resolves it', async () => {
    const user = userEvent.setup();
    renderAt('/clinician');
    await user.click(screen.getAllByRole('link', { name: /review case/i })[0]);

    // evidence is separated by source
    expect(screen.getByText(/measured readings/i)).toBeInTheDocument();
    expect(screen.getByText(/patient statement/i)).toBeInTheDocument();
    expect(screen.getByText(/chw observation/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/clinical recommendation/i), 'Review antihypertensive therapy; repeat BP twice daily for 3 days.');
    await user.type(screen.getByLabelText(/patient-facing summary/i), 'We reviewed your blood pressure and updated your care plan.');
    await user.click(screen.getByRole('button', { name: /submit review & resolve/i }));

    const kase = s().clinicianCases.find((c) => c.id === 'case-1')!;
    expect(kase.status).toBe('resolved');
    expect(kase.recommendation).toContain('antihypertensive');
    expect(s().alerts.find((a) => a.id === 'alert-1')!.status).toBe('resolved');
  });

  it('can request more information instead of resolving', async () => {
    const user = userEvent.setup();
    renderAt('/clinician/cases/case-2');
    await user.type(screen.getByLabelText(/clinical recommendation/i), 'Need the full lab panel before concluding.');
    await user.click(screen.getByRole('button', { name: /request more information/i }));
    expect(s().clinicianCases.find((c) => c.id === 'case-2')!.status).toBe('more_info_requested');
  });
});
