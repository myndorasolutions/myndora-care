import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PricingZone, UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { resolveMockPaystack } from '../config/environment';
import { PricingService } from '../pricing/pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';

const DEFAULT_ALLOCATED_VISITS = 4;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  private assertMockMode() {
    if (!resolveMockPaystack()) {
      throw new ServiceUnavailableException(
        'Live Paystack is disabled in this environment; set MOCK_PAYSTACK=true (simulation forces mock)',
      );
    }
  }

  async initialize(dto: InitializePaymentDto, actor: AuthUser) {
    this.assertMockMode();

    if (actor.role !== UserRole.SPONSOR) {
      throw new ForbiddenException('Only sponsors can initialize payments');
    }

    let sponsor = await this.prisma.sponsor.findUnique({
      where: { userId: actor.userId },
    });
    if (!sponsor) {
      throw new NotFoundException('Sponsor profile not found');
    }

    let zone: PricingZone = sponsor.pricingZone ?? PricingZone.ZONE_B;

    if (dto.patientId) {
      const patient = await this.prisma.patient.findFirst({
        where: { id: dto.patientId, sponsorId: sponsor.id },
      });
      if (!patient) {
        throw new NotFoundException(`Patient ${dto.patientId} not found for this sponsor`);
      }
      if (patient.pricingZone) {
        zone = patient.pricingZone;
      }
      if (patient.city && (patient.city !== sponsor.city || patient.pricingZone !== sponsor.pricingZone)) {
        sponsor = await this.prisma.sponsor.update({
          where: { id: sponsor.id },
          data: {
            city: patient.city ?? sponsor.city,
            pricingZone: patient.pricingZone ?? sponsor.pricingZone,
          },
        });
        zone = sponsor.pricingZone ?? zone;
      }
    }

    const planName = dto.planName ?? 'staging-sandbox';
    let amountNaira = dto.amountNaira ?? 0;
    let allocatedVisits = DEFAULT_ALLOCATED_VISITS;

    if (dto.planName) {
      const catalog = await this.pricingService.lookupPlanPrice(dto.planName, zone);
      if (catalog) {
        amountNaira = catalog.monthlyPriceNaira;
        allocatedVisits = catalog.allocatedVisits || DEFAULT_ALLOCATED_VISITS;
      }
    }

    if (!amountNaira || amountNaira < 100) {
      throw new BadRequestException(
        'amountNaira is required (min 100) unless a known Dual-Zone planName is provided',
      );
    }

    const reference = `mock_psk_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + 1);

    const result = await this.prisma.$transaction(async (tx) => {
      let subscription = await tx.subscription.findFirst({
        where: { sponsorId: sponsor!.id, planName },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription) {
        subscription = await tx.subscription.create({
          data: {
            sponsorId: sponsor!.id,
            planName,
            isActive: false,
            allocatedVisits,
            usedVisits: 0,
            renewalDate,
          },
        });
      } else {
        subscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            isActive: false,
            allocatedVisits,
            renewalDate,
          },
        });
      }

      const payment = await tx.payment.create({
        data: {
          sponsorId: sponsor!.id,
          subscriptionId: subscription.id,
          amount: amountNaira,
          currency: 'NGN',
          reference,
          status: 'pending',
        },
      });

      return { payment, subscription, allocatedVisits };
    });

    return {
      authorization_url: `https://checkout.paystack.com/mock/${reference}`,
      reference,
      paymentId: result.payment.id,
      subscriptionId: result.subscription.id,
      status: result.payment.status,
      amountNaira,
      pricingZone: zone,
      allocatedVisits: result.allocatedVisits,
    };
  }

  async handleWebhook(dto: PaymentWebhookDto) {
    this.assertMockMode();

    if (dto.event !== 'charge.success') {
      throw new BadRequestException(
        `Unsupported webhook event: ${dto.event}. Expected charge.success`,
      );
    }

    const reference = dto.data?.reference;
    if (!reference) {
      throw new BadRequestException('Webhook data.reference is required');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { reference },
    });
    if (!payment) {
      throw new NotFoundException(`Payment reference ${reference} not found`);
    }

    const existingSub = await this.prisma.subscription.findUnique({
      where: { id: payment.subscriptionId },
    });
    const allocatedVisits =
      existingSub?.allocatedVisits && existingSub.allocatedVisits > 0
        ? existingSub.allocatedVisits
        : DEFAULT_ALLOCATED_VISITS;

    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + 1);

    const updated = await this.prisma.$transaction(async (tx) => {
      const paid = await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'success' },
      });

      const subscription = await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          isActive: true,
          allocatedVisits,
          usedVisits: 0,
          renewalDate,
        },
      });

      return { payment: paid, subscription };
    });

    return {
      ok: true,
      event: dto.event,
      payment: updated.payment,
      subscription: {
        id: updated.subscription.id,
        sponsorId: updated.subscription.sponsorId,
        isActive: updated.subscription.isActive,
        allocatedVisits: updated.subscription.allocatedVisits,
        usedVisits: updated.subscription.usedVisits,
        planName: updated.subscription.planName,
        renewalDate: updated.subscription.renewalDate,
      },
    };
  }
}
