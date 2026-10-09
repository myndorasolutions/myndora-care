import { Badge, Card, EmptyState, KV, PageHeader } from '@/components/kit';
import { ApiError } from '@/lib/api';
import { useDualZonePricing } from '@/lib/adminQueries';
import { formatZoneLabel, formatZoneShort } from '@/lib/zoneLabels';

function formatNaira(n: number | null | undefined) {
  if (n == null) return '—';
  return `₦${n.toLocaleString('en-NG')}`;
}

export function AdminRateCardsPage() {
  const pricingQuery = useDualZonePricing();
  const data = pricingQuery.data;

  const errorMsg =
    pricingQuery.error instanceof ApiError
      ? pricingQuery.error.message
      : pricingQuery.isError
        ? 'Could not load dual-zone pricing.'
        : null;

  const zones = [
    { key: 'ZONE_A' as const, block: data?.zoneA },
    { key: 'ZONE_B' as const, block: data?.zoneB },
  ];

  return (
    <div>
      <PageHeader
        title="Rate cards"
        subtitle="Dual-zone regional pricing: plan catalogue and visit rates for ZONE A and ZONE B. Read-only from the live pricing API."
      />

      {errorMsg && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">{errorMsg}</p>
        </Card>
      )}

      {pricingQuery.isLoading ? (
        <Card>
          <p className="text-sm text-slate-500">Loading pricing…</p>
        </Card>
      ) : !data ? (
        <Card>
          <EmptyState title="No pricing data" />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <h3 className="mc-section-title">Service cities</h3>
            <div className="flex flex-wrap gap-2">
              {(data.zones.cities ?? []).map((c) => (
                <Badge
                  key={c.id}
                  tone={c.pricingZone === 'ZONE_A' ? 'blue' : 'amber'}
                >
                  {c.name} · {formatZoneShort(c.pricingZone)}
                </Badge>
              ))}
            </div>
          </Card>

          {zones.map(({ key, block }) => (
            <Card key={key}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-slate-900">
                  {formatZoneLabel(key)}
                </h3>
                <Badge tone={key === 'ZONE_A' ? 'blue' : 'amber'}>
                  {formatZoneShort(key)}
                </Badge>
              </div>
              {block?.visitRate && (
                <div className="mb-4 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
                  <KV label="Base visit">
                    {formatNaira(block.visitRate.baseVisitNaira)}
                  </KV>
                  <KV label="CHW payout">
                    {formatNaira(block.visitRate.chwPayoutNaira)}
                  </KV>
                  <KV label="Platform fee">
                    {formatNaira(block.visitRate.platformFeeNaira)}
                  </KV>
                  <KV label="Distance / 2km">
                    {formatNaira(block.visitRate.distanceSurchargePer2kmNaira)}
                  </KV>
                </div>
              )}
              <div className="space-y-2">
                {(block?.plans ?? []).map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {p.displayName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.allocatedVisits} visits / month
                      </p>
                    </div>
                    <p className="font-bold text-slate-900">
                      {formatNaira(p.monthlyPriceNaira)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
