import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/PageHeader';
import { pricingApi } from '@/lib/authApi';
import { paymentsApi } from '@/lib/paymentsApi';
import {
  FRAMEWORK2_ZONE_PRICES,
  PRICING_TIERS,
  type SubscriptionPlanId,
} from '@/lib/pilotData';
import { sponsorApi } from '@/lib/sponsorApi';
import { vitalsApi } from '@/lib/vitalsApi';
import { formatZoneLabel } from '@/lib/zoneLabels';

export function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get('patientId');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>('family_care');
  const [error, setError] = useState<string | null>(null);
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [amountNaira, setAmountNaira] = useState<number | null>(null);

  const patientsQuery = useQuery({
    queryKey: ['sponsor', 'patients'],
    queryFn: () => vitalsApi.listMyPatients(),
  });

  const onboardingQuery = useQuery({
    queryKey: ['sponsor', 'onboarding'],
    queryFn: () => sponsorApi.getOnboarding(),
  });

  const patient =
    patientsQuery.data?.find((p) => p.id === patientIdParam) ??
    patientsQuery.data?.[0] ??
    null;

  const city =
    patient?.city ?? onboardingQuery.data?.sponsorCity ?? 'Ilorin';

  const plansQuery = useQuery({
    queryKey: ['pricing', 'plans', city],
    queryFn: () => pricingApi.getPlans({ city }),
  });

  const zone =
    (patient?.pricingZone as 'ZONE_A' | 'ZONE_B' | undefined) ??
    (plansQuery.data?.pricingZone as 'ZONE_A' | 'ZONE_B' | undefined) ??
    'ZONE_B';

  const planCards = useMemo(
    () =>
      plansQuery.data?.plans.map((p) => ({
        id: p.planKey as SubscriptionPlanId,
        name: p.displayName,
        description: p.description,
        priceNaira:
          p.monthlyPriceNaira ??
          FRAMEWORK2_ZONE_PRICES[zone][p.planKey as SubscriptionPlanId] ??
          0,
      })) ??
      PRICING_TIERS.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        priceNaira: FRAMEWORK2_ZONE_PRICES[zone][t.id],
      })),
    [plansQuery.data, zone],
  );

  const initPay = useMutation({
    mutationFn: async () => {
      if (!patient?.id) throw new Error('Missing patient');
      return paymentsApi.initialize({
        planName: selectedPlan,
        patientId: patient.id,
      });
    },
    onSuccess: (res) => {
      setPendingReference(res.reference);
      setAmountNaira(res.amountNaira);
      setError(null);
    },
    onError: () => setError('Could not start mock payment. Try again.'),
  });

  const completePay = useMutation({
    mutationFn: async () => {
      if (!pendingReference) throw new Error('Missing reference');
      return paymentsApi.completeMock(pendingReference);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sponsor', 'onboarding'] });
      navigate('/sponsor/dashboard', { replace: true });
    },
    onError: () => setError('Mock payment confirmation failed.'),
  });

  if (patientsQuery.isLoading || onboardingQuery.isLoading) {
    return <p className="text-sm text-slate-500">Loading checkout…</p>;
  }

  if (!patient) {
    return (
      <>
        <PageHeader title="Subscription checkout" subtitle="Add a patient first" />
        <p className="text-sm text-slate-600">
          No patient profile found.{' '}
          <button
            type="button"
            className="font-medium text-primary underline"
            onClick={() => navigate('/sponsor/onboarding/add-patient')}
          >
            Add patient
          </button>
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Subscription checkout"
        subtitle={`${patient.fullName} — ${city} / ${formatZoneLabel(zone)}`}
      />

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Choose a plan</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {planCards.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => {
                setSelectedPlan(tier.id);
                setPendingReference(null);
              }}
              className={`card text-left transition ${
                selectedPlan === tier.id
                  ? 'border-primary ring-2 ring-primary'
                  : 'hover:border-primary/40'
              }`}
            >
              <p className="font-semibold">{tier.name}</p>
              <p className="mt-1 text-sm text-slate-500">{tier.description}</p>
              <p className="mt-3 text-lg font-bold text-primary">
                ₦{tier.priceNaira.toLocaleString()}/mo
              </p>
            </button>
          ))}
        </div>
      </section>

      {!pendingReference ? (
        <button
          type="button"
          className="btn-primary"
          disabled={initPay.isPending}
          onClick={() => initPay.mutate()}
        >
          {initPay.isPending ? 'Preparing…' : 'Pay with mock Paystack'}
        </button>
      ) : (
        <div className="max-w-md rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="font-semibold text-slate-900">Mock Paystack checkout</p>
          <p className="mt-1 text-sm text-slate-600">
            Reference <span className="font-mono text-xs">{pendingReference}</span>
          </p>
          {amountNaira != null && (
            <p className="mt-2 text-lg font-bold text-primary">
              ₦{amountNaira.toLocaleString()}
            </p>
          )}
          <button
            type="button"
            className="btn-primary mt-4 w-full"
            disabled={completePay.isPending}
            onClick={() => completePay.mutate()}
          >
            {completePay.isPending ? 'Confirming…' : 'Complete mock payment'}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </>
  );
}
