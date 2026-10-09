import { Injectable, NotFoundException } from '@nestjs/common';
import { PricingZone } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async listZones() {
    const cities = await this.prisma.serviceCity.findMany({
      orderBy: [{ pricingZone: 'asc' }, { name: 'asc' }],
    });
    return {
      zones: [
        {
          id: PricingZone.ZONE_A,
          label: 'Zone A — High-Cost Metro',
          cities: cities
            .filter((c) => c.pricingZone === PricingZone.ZONE_A)
            .map((c) => c.name),
        },
        {
          id: PricingZone.ZONE_B,
          label: 'Zone B — Standard Urban',
          cities: cities
            .filter((c) => c.pricingZone === PricingZone.ZONE_B)
            .map((c) => c.name),
        },
      ],
      cities: cities.map((c) => ({
        id: c.id,
        name: c.name,
        pricingZone: c.pricingZone,
      })),
    };
  }

  async resolveZone(zone?: string, city?: string): Promise<PricingZone> {
    if (zone === PricingZone.ZONE_A || zone === PricingZone.ZONE_B) {
      return zone;
    }
    if (city) {
      const row = await this.prisma.serviceCity.findUnique({ where: { name: city } });
      if (row) return row.pricingZone;
    }
    throw new NotFoundException(
      'Provide a valid zone (ZONE_A|ZONE_B) or city (e.g. Ilorin, Lagos)',
    );
  }

  async listPlans(zone?: string, city?: string) {
    const pricingZone = await this.resolveZone(zone, city);
    const plans = await this.prisma.subscriptionPlanCatalog.findMany({
      include: {
        zonePrices: { where: { pricingZone } },
      },
    });

    // Stable display order by known plan keys
    const order = [
      'basic_monitor',
      'family_care',
      'assisted_care',
      'premium_chronic',
    ];
    plans.sort(
      (a, b) => order.indexOf(a.planKey) - order.indexOf(b.planKey),
    );

    const visitRate = await this.prisma.visitRate.findUnique({
      where: { pricingZone },
    });

    return {
      pricingZone,
      city: city ?? null,
      plans: plans.map((p) => ({
        id: p.id,
        planKey: p.planKey,
        displayName: p.displayName,
        description: p.description,
        allocatedVisits: p.allocatedVisits,
        monthlyPriceNaira: p.zonePrices[0]?.monthlyPriceNaira ?? null,
      })),
      visitRate: visitRate
        ? {
            baseVisitNaira: visitRate.baseVisitNaira,
            chwPayoutNaira: visitRate.chwPayoutNaira,
            platformFeeNaira: visitRate.platformFeeNaira,
            distanceSurchargePer2kmNaira: visitRate.distanceSurchargePer2kmNaira,
          }
        : null,
    };
  }

  async lookupPlanPrice(planKey: string, pricingZone: PricingZone) {
    const plan = await this.prisma.subscriptionPlanCatalog.findUnique({
      where: { planKey },
      include: {
        zonePrices: { where: { pricingZone } },
      },
    });
    if (!plan || !plan.zonePrices[0]) {
      return null;
    }
    return {
      plan,
      monthlyPriceNaira: plan.zonePrices[0].monthlyPriceNaira,
      allocatedVisits: plan.allocatedVisits,
    };
  }
}
