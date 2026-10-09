// Rules-based city rate-card pricing engine.
// customer total = CHW payout + travel/distance component + approved add-ons + platform fee.
// No surge pricing. Never priced on wealth, diaspora status, desperation, or medical severity.

import type { City, CityRateCard, ServiceType } from '@/types';

export interface QuoteOptions {
  distanceKm: number;
  evening?: boolean;
  weekend?: boolean;
  sameDay?: boolean;
  travelMinutesOverBaseline?: number;
}

export interface Quote {
  payout: number;
  travelComponent: number;
  adjustments: { label: string; amount: number }[];
  platformFee: number;
  total: number;
  card: CityRateCard;
}

export function findRateCard(cards: CityRateCard[], city: City, serviceType: ServiceType): CityRateCard | undefined {
  return cards.find((c) => c.city === city && c.serviceType === serviceType && c.status === 'approved');
}

export function quoteService(card: CityRateCard, opts: QuoteOptions): Quote {
  const band = card.distanceBands.find((b) => opts.distanceKm <= b.upToKm) ?? card.distanceBands[card.distanceBands.length - 1];
  const travelComponent = opts.distanceKm <= card.baseRadiusKm ? 0 : band.addFee;

  const adjustments: { label: string; amount: number }[] = [];
  const base = card.baseCharge * card.chwTierMultiplier;

  if (opts.travelMinutesOverBaseline && opts.travelMinutesOverBaseline > 0) {
    const amount = Math.round(base * (card.travelTimeAdjustmentPct / 100));
    adjustments.push({ label: 'Travel-time adjustment', amount });
  }
  if (opts.evening) {
    adjustments.push({ label: 'Evening adjustment', amount: Math.round(base * (card.eveningAdjustmentPct / 100)) });
  }
  if (opts.weekend) {
    adjustments.push({ label: 'Weekend adjustment', amount: Math.round(base * (card.weekendAdjustmentPct / 100)) });
  }
  if (opts.sameDay) {
    const amount = Math.min(Math.round(base * (card.sameDayAdjustmentPct / 100)), card.sameDayCap);
    adjustments.push({ label: 'Same-day adjustment (capped)', amount });
  }

  const payout = Math.round(base);
  const subtotal = payout + travelComponent + adjustments.reduce((s, a) => s + a.amount, 0);
  const platformFee = Math.round(subtotal * (card.platformFeePct / 100));

  return {
    payout,
    travelComponent,
    adjustments,
    platformFee,
    total: subtotal + platformFee,
    card,
  };
}

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}
