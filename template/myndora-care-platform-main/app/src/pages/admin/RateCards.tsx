// Admin — Rate Cards: manage city rate cards behind approval status.
import { useState } from 'react';
import { formatNaira, quoteService } from '@/lib/pricing';
import { useStore } from '@/store/useStore';
import { useToast } from '@/store/ui';
import { Badge, Btn, Card, Input, KV, PageHeader, type BadgeTone } from '@/components/kit';

const TONE: Record<string, BadgeTone> = { approved: 'green', pending: 'amber', rejected: 'red' };

export default function AdminRateCards() {
  const rateCards = useStore((s) => s.rateCards);
  const toggleRateCardStatus = useStore((s) => s.toggleRateCardStatus);
  const updateRateCardCharge = useStore((s) => s.updateRateCardCharge);
  const { toast } = useToast();
  const [editing, setEditing] = useState<Record<string, string>>({});

  return (
    <div>
      <PageHeader
        title="City Rate Cards"
        subtitle="Rules-based pricing: customer total = CHW payout + travel/distance + approved add-ons + platform fee. No surge pricing, ever."
      />
      <div className="space-y-4">
        {rateCards.map((rc) => {
          const example = quoteService(rc, { distanceKm: 7, weekend: true });
          return (
            <Card key={rc.id}>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-bold text-slate-900">{rc.city} — {rc.serviceType.replace('_', ' ')}</h3>
                  <p className="text-xs text-slate-500">Effective {rc.effectiveDate} · platform fee {rc.platformFeePct}% · tier ×{rc.chwTierMultiplier}</p>
                </div>
                <Badge tone={TONE[rc.status]}>{rc.status}</Badge>
              </div>
              <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                <KV label="Base charge (within radius)">
                  <span className="inline-flex items-center gap-2">
                    {formatNaira(rc.baseCharge)}
                    <span className="inline-flex items-center gap-1">
                      <Input
                        className="!w-24 !min-h-8 !py-1 text-xs"
                        placeholder="New"
                        inputMode="numeric"
                        value={editing[rc.id] ?? ''}
                        onChange={(e) => setEditing((s) => ({ ...s, [rc.id]: e.target.value }))}
                        aria-label={`New base charge for ${rc.city} ${rc.serviceType}`}
                      />
                      <Btn size="sm" variant="secondary" disabled={!editing[rc.id]} onClick={() => {
                        updateRateCardCharge(rc.id, Number(editing[rc.id]));
                        setEditing((s) => ({ ...s, [rc.id]: '' }));
                        toast('Rate card updated');
                      }}>Save</Btn>
                    </span>
                  </span>
                </KV>
                <KV label="Base radius">{rc.baseRadiusKm} km</KV>
                <KV label="Distance bands">{rc.distanceBands.filter((b) => b.upToKm < 999).map((b) => `≤${b.upToKm}km +${formatNaira(b.addFee)}`).join(' · ')}</KV>
                <KV label="Travel-time adj.">+{rc.travelTimeAdjustmentPct}%</KV>
                <KV label="Evening / weekend">+{rc.eveningAdjustmentPct}% / +{rc.weekendAdjustmentPct}%</KV>
                <KV label="Same-day">+{rc.sameDayAdjustmentPct}% (cap {formatNaira(rc.sameDayCap)})</KV>
              </div>
              <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                <b>Example quote (7 km, weekend):</b> payout {formatNaira(example.payout)} + travel {formatNaira(example.travelComponent)}
                {example.adjustments.map((a) => ` + ${a.label.toLowerCase()} ${formatNaira(a.amount)}`).join('')}
                {' '}+ platform fee {formatNaira(example.platformFee)} = <b>{formatNaira(example.total)}</b>
              </div>
              <div className="mt-3">
                <Btn size="sm" variant={rc.status === 'approved' ? 'danger-soft' : 'primary'} onClick={() => { toggleRateCardStatus(rc.id); toast(rc.status === 'approved' ? 'Rate card moved to pending review' : 'Rate card approved'); }}>
                  {rc.status === 'approved' ? 'Send back to review' : 'Approve rate card'}
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
