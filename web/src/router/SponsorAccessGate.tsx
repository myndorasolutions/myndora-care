import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { resolveSponsorHome, sponsorApi } from '@/lib/sponsorApi';

/**
 * Ensures sponsors complete patient + payment before portal pages,
 * and keeps completed sponsors out of onboarding.
 */
export function SponsorAccessGate() {
  const location = useLocation();
  const onboardingQuery = useQuery({
    queryKey: ['sponsor', 'onboarding'],
    queryFn: () => sponsorApi.getOnboarding(),
    retry: 1,
  });

  if (onboardingQuery.isLoading) {
    return (
      <p className="p-6 text-sm text-slate-500">Checking sponsor onboarding…</p>
    );
  }

  const path = location.pathname;
  const onOnboarding = path.includes('/sponsor/onboarding');
  const onProtectedPortal =
    path.includes('/sponsor/') && !onOnboarding;

  if (onboardingQuery.isError || !onboardingQuery.data) {
    if (onProtectedPortal) {
      return <Navigate to="/sponsor/onboarding/add-patient" replace />;
    }
    return (
      <div data-theme="sponsor">
        <Outlet />
      </div>
    );
  }

  const status = onboardingQuery.data;
  const ready = status.hasPatient && status.hasActiveSubscription;
  const target = resolveSponsorHome(status);

  if (onProtectedPortal && !ready) {
    return <Navigate to={target} replace />;
  }

  if (onOnboarding && ready) {
    return <Navigate to="/sponsor/dashboard" replace />;
  }

  if (
    onOnboarding &&
    path.includes('add-patient') &&
    status.hasPatient &&
    !status.hasActiveSubscription
  ) {
    return <Navigate to="/sponsor/onboarding/checkout" replace />;
  }

  return (
    <div data-theme="sponsor">
      <Outlet />
    </div>
  );
}
