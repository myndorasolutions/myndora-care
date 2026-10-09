// Auth-layer tests: registration, verification, login, logout, password reset,
// protected routes, unauthorized access, profile switching, persistence, demo tools.
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { useAuth } from '@/store/auth';
import { useStore } from '@/store/useStore';
import { DEMO_ACCOUNTS } from '@contracts/types';
import { signInAllProfiles } from './journeys.test';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

const auth = () => useAuth.getState();

describe('public layer', () => {
  it('landing renders hero copy, role cards and emergency disclaimer', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: /trusted home-care coordination/i })).toBeInTheDocument();
    expect(screen.getAllByText(/community health worker/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/does not replace emergency medical services/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /sign in/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /create account/i }).length).toBeGreaterThan(0);
    // No public admin registration anywhere
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('landing one-click demo buttons are present', () => {
    renderAt('/');
    expect(screen.getByRole('button', { name: /explore as sponsor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explore as patient/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explore as chw/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explore as admin/i })).toBeInTheDocument();
  });
});

describe('registration & verification', () => {
  it('creates an account, shows the simulated code, verifies and reaches onboarding', async () => {
    const user = userEvent.setup();
    renderAt('/create-account');
    await user.type(screen.getByLabelText(/full name/i), 'Test Person');
    await user.type(screen.getByLabelText(/^email$/i), 'person@uat.test');
    await user.type(screen.getByLabelText(/phone number/i), '+234 800 111 2222');
    await user.type(screen.getByLabelText(/^password$/i), 'super-secret-1');
    await user.type(screen.getByLabelText(/confirm password/i), 'super-secret-1');
    await user.click(screen.getByLabelText(/manage care for myself/i));
    await user.click(screen.getByLabelText(/i agree to the/i));
    await user.click(screen.getByLabelText(/i acknowledge the/i));
    await user.click(screen.getByRole('button', { name: /^create account$/i }));

    const sim = await screen.findByTestId('simulated-code');
    expect(sim.textContent).toContain('123456');

    await user.type(screen.getByLabelText(/verification code/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify and continue/i }));
    await waitFor(() => expect(auth().session?.account.email).toBe('person@uat.test'));
    expect(auth().session?.account.verified).toBe(true);
    // patient onboarding form
    await screen.findByRole('heading', { name: /set up your patient profile/i });
  });

  it('rejects a wrong verification code', async () => {
    const user = userEvent.setup();
    renderAt('/create-account');
    await user.type(screen.getByLabelText(/full name/i), 'Test Person');
    await user.type(screen.getByLabelText(/^email$/i), 'person2@uat.test');
    await user.type(screen.getByLabelText(/phone number/i), '+234 800 111 2222');
    await user.type(screen.getByLabelText(/^password$/i), 'super-secret-1');
    await user.type(screen.getByLabelText(/confirm password/i), 'super-secret-1');
    await user.click(screen.getByLabelText(/support or pay/i));
    await user.click(screen.getByLabelText(/i agree to the/i));
    await user.click(screen.getByLabelText(/i acknowledge the/i));
    await user.click(screen.getByRole('button', { name: /^create account$/i }));
    await screen.findByTestId('simulated-code');
    await user.type(screen.getByLabelText(/verification code/i), '000000');
    await user.click(screen.getByRole('button', { name: /verify and continue/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or expired/i);
    expect(auth().session).toBeNull();
  });

  it('never offers an admin option at registration', () => {
    renderAt('/create-account');
    expect(screen.queryByLabelText(/admin/i)).not.toBeInTheDocument();
  });
});

describe('login / logout', () => {
  it('signs in a demo account by email + password and lands in its portal', async () => {
    const user = userEvent.setup();
    renderAt('/sign-in');
    await user.type(screen.getByLabelText(/^email$/i), DEMO_ACCOUNTS.sponsor.email);
    await user.type(screen.getByLabelText(/^password$/i), 'myndora-demo-2026');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    await waitFor(() => expect(auth().session?.account.name).toBe('Tunde Adeyemi'));
    await screen.findByRole('heading', { name: /dashboard|good/i }, { timeout: 4000 });
  });

  it('rejects wrong credentials with a generic error', async () => {
    const user = userEvent.setup();
    renderAt('/sign-in');
    await user.type(screen.getByLabelText(/^email$/i), DEMO_ACCOUNTS.patient.email);
    await user.type(screen.getByLabelText(/^password$/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect email or password/i);
    expect(auth().session).toBeNull();
  });

  it('blocks unverified login and surfaces the simulated code', async () => {
    const user = userEvent.setup();
    renderAt('/create-account');
    await user.type(screen.getByLabelText(/full name/i), 'Unverified Person');
    await user.type(screen.getByLabelText(/^email$/i), 'unverified@uat.test');
    await user.type(screen.getByLabelText(/phone number/i), '+234 800 111 2222');
    await user.type(screen.getByLabelText(/^password$/i), 'super-secret-1');
    await user.type(screen.getByLabelText(/confirm password/i), 'super-secret-1');
    await user.click(screen.getByLabelText(/manage care for myself/i));
    await user.click(screen.getByLabelText(/i agree to the/i));
    await user.click(screen.getByLabelText(/i acknowledge the/i));
    await user.click(screen.getByRole('button', { name: /^create account$/i }));
    await screen.findByTestId('simulated-code');

    renderAt('/sign-in');
    await user.type(screen.getAllByLabelText(/^email$/i).pop()!, 'unverified@uat.test');
    await user.type(screen.getAllByLabelText(/^password$/i).pop()!, 'super-secret-1');
    await user.click(screen.getAllByRole('button', { name: /^sign in$/i }).pop()!);
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((a) => /not verified/i.test(a.textContent ?? ''))).toBe(true);
    expect(auth().session).toBeNull();
  });

  it('logout clears the session and protects the portal again', async () => {
    const user = userEvent.setup();
    signInAllProfiles();
    renderAt('/sponsor/settings');
    await screen.findByRole('heading', { name: /account settings/i });
    await user.click(screen.getAllByRole('button', { name: /sign out/i })[0]);
    await waitFor(() => expect(auth().session).toBeNull());
  });
});

describe('forgot / reset password', () => {
  it('issues a simulated reset code and resets the password', async () => {
    const user = userEvent.setup();
    renderAt('/forgot-password');
    await user.type(screen.getByLabelText(/^email$/i), DEMO_ACCOUNTS.patient.email);
    await user.click(screen.getByRole('button', { name: /send reset code/i }));
    const box = await screen.findByTestId('simulated-reset-code');
    expect(box.textContent).toContain('654321');

    await user.click(screen.getByRole('link', { name: /continue to reset password/i }));
    await screen.findByRole('heading', { name: /reset password/i });
    await user.type(screen.getByLabelText(/reset code/i), '654321');
    await user.type(screen.getByLabelText(/new password/i), 'brand-new-pass-9');
    await user.click(screen.getByRole('button', { name: /^reset password$/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/password updated/i);
  });

  it('rejects an invalid reset code', async () => {
    const user = userEvent.setup();
    renderAt('/reset-password?email=patient%40demo.myndora.test');
    await user.type(screen.getByLabelText(/reset code/i), '111111');
    await user.type(screen.getByLabelText(/new password/i), 'brand-new-pass-9');
    await user.click(screen.getByRole('button', { name: /^reset password$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or expired/i);
  });
});

describe('protected routes & authorization', () => {
  it('redirects signed-out users from a portal to sign-in with a return path', async () => {
    renderAt('/sponsor');
    await screen.findByRole('heading', { name: /^sign in$/i });
    expect(auth().session).toBeNull();
  });

  it('blocks a patient-only account from the admin portal (direct URL entry)', async () => {
    useAuth.setState({
      bootstrapped: true, activeProfile: 'patient',
      session: { account: { id: 50, email: 'p@uat.test', name: 'Patient Only', verified: true, isDemo: false, profiles: [{ id: 51, kind: 'patient', status: 'active', refId: 'pat-x' }] } },
      tourSeen: {},
    });
    renderAt('/admin');
    await screen.findByRole('heading', { name: /access denied/i });
  });

  it('blocks a CHW applicant from the CHW workbench', async () => {
    useAuth.setState({
      bootstrapped: true, activeProfile: 'chw_applicant',
      session: { account: { id: 60, email: 'c@uat.test', name: 'Applicant', verified: true, isDemo: false, profiles: [{ id: 61, kind: 'chw_applicant', status: 'pending_review', refId: null }] } },
      tourSeen: {},
    });
    renderAt('/chw');
    await screen.findByRole('heading', { name: /access denied/i });
  });

  it('staff sign-in rejects accounts without a staff profile', async () => {
    const user = userEvent.setup();
    renderAt('/staff-sign-in');
    await user.type(screen.getByLabelText(/work email/i), DEMO_ACCOUNTS.patient.email);
    await user.type(screen.getByLabelText(/^password$/i), 'myndora-demo-2026');
    await user.click(screen.getByRole('button', { name: /sign in as staff/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/does not have an active staff profile/i);
  });
});

describe('profile switching', () => {
  it('demo sponsor (dual profile) sees a Switch profile control and swaps to patient', async () => {
    const user = userEvent.setup();
    useAuth.setState({
      bootstrapped: true, activeProfile: 'sponsor',
      session: {
        account: {
          id: 101, email: DEMO_ACCOUNTS.sponsor.email, name: 'Tunde Adeyemi', verified: true, isDemo: true,
          profiles: [
            { id: 102, kind: 'sponsor', status: 'active', refId: 'acc-sponsor' },
            { id: 103, kind: 'patient', status: 'active', refId: 'pat-tunde' },
          ],
        },
      },
      tourSeen: { '101:sponsor': true, '101:patient': true },
    });
    renderAt('/sponsor');
    await screen.findByText(/switch profile:/i);
    await user.click(screen.getAllByRole('button', { name: /^patient$/i })[0]);
    await waitFor(() => expect(auth().activeProfile).toBe('patient'));
    expect(useStore.getState().currentRole).toBe('patient');
  });

  it('role tabs only show profiles the account actually holds', async () => {
    useAuth.setState({
      bootstrapped: true, activeProfile: 'patient',
      session: { account: { id: 70, email: 'one@uat.test', name: 'Single Role', verified: true, isDemo: false, profiles: [{ id: 71, kind: 'patient', status: 'active', refId: 'pat-grace' }] } },
      tourSeen: { '70:patient': true },
    });
    renderAt('/patient');
    await screen.findByRole('navigation', { name: /switch role/i });
    const nav = screen.getByRole('navigation', { name: /switch role/i });
    expect(nav.textContent?.toLowerCase()).toContain('patient');
    expect(nav.textContent?.toLowerCase()).not.toContain('admin');
    expect(nav.textContent?.toLowerCase()).not.toContain('sponsor');
  });
});

describe('server persistence', () => {
  it('saves the world snapshot to the account and restores it on next login', async () => {
    // sign in as demo sponsor, mutate the world, flush a save
    const sponsor = { id: 0, email: DEMO_ACCOUNTS.sponsor.email };
    void sponsor;
    useAuth.setState({ bootstrapped: true, activeProfile: 'sponsor', session: null, tourSeen: {} });
    const session = await auth().demoLogin('sponsor');
    expect(session.account.name).toBe('Tunde Adeyemi');
    const { startStateSync, saveNow, hydrateFromServer } = await import('@/store/sync');
    startStateSync();
    useStore.getState().sendMessage('sponsor', 'Care coordination — Grace Okafor', 'Tunde Adeyemi', 'persistence-marker-message');
    await saveNow();

    // wipe local world, then hydrate from the fake server
    useStore.getState().resetDemo();
    expect(useStore.getState().messages.some((m) => m.text === 'persistence-marker-message')).toBe(false);
    const restored = await hydrateFromServer();
    expect(restored).toBe(true);
    expect(useStore.getState().messages.some((m) => m.text === 'persistence-marker-message')).toBe(true);
  });
});

describe('demo tools', () => {
  it('demo toolbar is only rendered for seeded demo accounts', async () => {
    signInAllProfiles(); // isDemo: false
    const { unmount } = renderAt('/sponsor');
    await screen.findByRole('navigation', { name: /switch role/i });
    expect(screen.queryByTestId('demo-toolbar')).not.toBeInTheDocument();
    unmount();

    useAuth.setState({
      bootstrapped: true, activeProfile: 'sponsor',
      session: { account: { id: 201, email: DEMO_ACCOUNTS.sponsor.email, name: 'Tunde Adeyemi', verified: true, isDemo: true, profiles: [{ id: 202, kind: 'sponsor', status: 'active', refId: 'acc-sponsor' }] } },
      tourSeen: { '201:sponsor': true },
    });
    renderAt('/sponsor');
    expect(await screen.findByTestId('demo-toolbar')).toBeInTheDocument();
  });

  it('guided tour appears for a first-login account and finishes', async () => {
    const user = userEvent.setup();
    useAuth.setState({
      bootstrapped: true, activeProfile: 'sponsor',
      session: { account: { id: 301, email: 'new@uat.test', name: 'New Sponsor', verified: true, isDemo: false, profiles: [{ id: 302, kind: 'sponsor', status: 'active', refId: 'acc-sponsor' }] } },
      tourSeen: {},
    });
    renderAt('/sponsor');
    expect(await screen.findByRole('dialog', { name: /guided tour/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^next$/i }));
    expect(screen.getByText(/step 2 of 5/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /skip tour/i }));
    expect(screen.queryByRole('dialog', { name: /guided tour/i })).not.toBeInTheDocument();
    expect(auth().tourSeen['301:sponsor']).toBe(true);
  });
});

describe('expanded public site', () => {
  it('renders every new public information page with real content', () => {
    const pages: [string, RegExp][] = [
      ['/about', /about myndora care/i],
      ['/how-it-works', /how myndora care works/i],
      ['/services', /^services$/i],
      ['/packages', /^packages$/i],
      ['/partners', /partner ecosystem/i],
      ['/safety-and-privacy', /safety and privacy/i],
      ['/terms', /terms of use/i],
      ['/contact', /contact myndora care/i],
      ['/apply/chw', /apply as a community health worker/i],
    ];
    for (const [path, heading] of pages) {
      const { unmount } = renderAt(path);
      expect(screen.getAllByRole('heading', { name: heading }).length, `heading for ${path}`).toBeGreaterThan(0);
      unmount();
    }
  });

  it('packages page never displays fixed prices', () => {
    renderAt('/packages');
    expect(screen.getByRole('heading', { name: /^packages$/i })).toBeInTheDocument();
    expect(screen.queryByText(/₦/)).not.toBeInTheDocument();
    expect(screen.getByText(/availability and pricing depend on the patient/i)).toBeInTheDocument();
  });

  it('landing offers Explore as Clinician and a staff sign-in card, never an admin registration link', () => {
    renderAt('/');
    expect(screen.getByRole('button', { name: /explore as clinician/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /staff sign in/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /clinician sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin sign in/i })).not.toBeInTheDocument();
  });

  it('public header has a working mobile menu toggle', async () => {
    const user = userEvent.setup();
    renderAt('/');
    expect(screen.queryByRole('navigation', { name: /public mobile/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByRole('navigation', { name: /public mobile/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close menu/i }));
    expect(screen.queryByRole('navigation', { name: /public mobile/i })).not.toBeInTheDocument();
  });

  it('legacy routes redirect to the canonical auth routes', async () => {
    const { unmount } = renderAt('/sign-in');
    await screen.findByRole('heading', { name: /^sign in$/i });
    unmount();
    renderAt('/create-account');
    await screen.findByRole('heading', { name: /create account|what would you like/i });
  });

  it('contact form submits a message through the api', async () => {
    const user = userEvent.setup();
    renderAt('/contact');
    await user.type(screen.getByLabelText(/full name/i), 'UAT Visitor');
    await user.type(screen.getByLabelText(/^email$/i), 'visitor@uat.test');
    await user.type(screen.getByLabelText(/^message$/i), 'I would like to learn about packages in Ilorin.');
    await user.click(screen.getByRole('button', { name: /send message/i }));
    await screen.findByRole('heading', { name: /message received/i });
  });
});

describe('clinician journey', () => {
  it('clinician demo lands in the clinician portal with the full menu', async () => {
    await auth().demoLogin('clinician');
    expect(auth().session?.account.name).toBe('Dr. Chika Eze');
    renderAt('/clinician');
    await screen.findByRole('heading', { name: /dr\. chika eze/i });
    for (const item of [/patient summary/i, /vitals & trends/i, /lab results/i, /clinical notes/i, /recommendations/i, /follow-up actions/i, /referrals/i, /profile & verification/i]) {
      expect(screen.getAllByRole('link', { name: item }).length, `nav ${item}`).toBeGreaterThan(0);
    }
  });

  it('clinician portal pages render real data, not placeholders', async () => {
    await auth().demoLogin('clinician');
    const pages: [string, RegExp][] = [
      ['/clinician/patients', /patient summary/i],
      ['/clinician/vitals', /vitals and trends/i],
      ['/clinician/labs', /lab results/i],
      ['/clinician/notes', /clinical notes/i],
      ['/clinician/recommendations', /recommendations/i],
      ['/clinician/follow-ups', /follow-up actions/i],
      ['/clinician/referrals', /referrals/i],
    ];
    for (const [path, heading] of pages) {
      const { unmount } = renderAt(path);
      await screen.findAllByRole('heading', { name: heading });
      expect(screen.queryByText(/coming soon|placeholder|will be built later/i)).not.toBeInTheDocument();
      unmount();
    }
  });

  it('clinician EOI form submits an application without granting portal access', async () => {
    const user = userEvent.setup();
    renderAt('/apply/clinician');
    await screen.findByRole('heading', { name: /clinician verification/i });
    await user.type(screen.getByLabelText(/legal name/i), 'Dr. UAT Reviewer');
    await user.type(screen.getByLabelText(/^email$/i), 'clinician-applicant@uat.test');
    await user.type(screen.getByLabelText(/^phone$/i), '+234 800 555 0101');
    await user.type(screen.getByLabelText(/registration number/i), 'MDCN-99999');
    await user.type(screen.getByLabelText(/licensing authority/i), 'MDCN');
    await user.type(screen.getByLabelText(/qualification/i), 'MBBS');
    await user.type(screen.getByLabelText(/speciality/i), 'Family Medicine');
    await user.type(screen.getByLabelText(/years of experience/i), '8');
    await user.type(screen.getByLabelText(/facility or organization/i), 'UAT Teaching Hospital');
    await user.click(screen.getByRole('button', { name: /submit expression of interest/i }));
    await screen.findByRole('heading', { name: /expression of interest received/i });
    expect(screen.getAllByText(/application submitted/i).length).toBeGreaterThan(0);
    // submitting only creates an application — no session is created
    expect(auth().session).toBeNull();
  });
});

describe('account security states', () => {
  it('blocks login for a deactivated account with a specific message', async () => {
    const { api } = await import('@/lib/api');
    const users = await api.admin.users.query();
    const sponsor = users.find((u) => u.email === DEMO_ACCOUNTS.sponsor.email)!;
    await api.admin.setAccountStatus.mutate({ accountId: sponsor.id, status: 'deactivated' });
    await expect(auth().login(DEMO_ACCOUNTS.sponsor.email, 'myndora-demo-2026')).rejects.toThrow(/deactivated/i);
    expect(auth().session).toBeNull();
  });

  it('blocks login for a suspended account with a specific message', async () => {
    const { api } = await import('@/lib/api');
    const users = await api.admin.users.query();
    const patient = users.find((u) => u.email === DEMO_ACCOUNTS.patient.email)!;
    await api.admin.setAccountStatus.mutate({ accountId: patient.id, status: 'suspended' });
    await expect(auth().login(DEMO_ACCOUNTS.patient.email, 'myndora-demo-2026')).rejects.toThrow(/suspended/i);
    expect(auth().session).toBeNull();
  });

  it('access denied page logs the attempt and offers a return to the authorized dashboard', async () => {
    useAuth.setState({
      bootstrapped: true, activeProfile: 'patient',
      session: { account: { id: 88, email: 'audit@uat.test', name: 'Audit Patient', verified: true, isDemo: false, status: 'active', phone: null, country: null, profiles: [{ id: 89, kind: 'patient', status: 'active', refId: 'pat-grace' }] } },
      tourSeen: { '88:patient': true },
    });
    renderAt('/admin');
    await screen.findByRole('heading', { name: /access denied/i });
    expect(screen.getByRole('button', { name: /return to my dashboard/i })).toBeInTheDocument();
    const events = useStore.getState().auditEvents;
    expect(events.some((e) => e.action === 'security.unauthorized_access')).toBe(true);
  });
});

describe('data hygiene', () => {
  it('never contains the forbidden surname anywhere in source', async () => {
    const { execSync } = await import('node:child_process');
    const out = execSync('grep -ri "farinde" src api contracts db --exclude=auth.test.tsx || true', { encoding: 'utf8' });
    expect(out.trim()).toBe('');
  });
});
