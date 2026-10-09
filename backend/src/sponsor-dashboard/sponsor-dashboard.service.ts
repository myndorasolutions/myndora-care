import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AlertSeverity, ServiceStatus } from '@prisma/client';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SponsorDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireSponsor(actor: AuthUser) {
    const sponsor = await this.prisma.sponsor.findUnique({
      where: { userId: actor.userId },
    });
    if (!sponsor) {
      throw new ForbiddenException('Sponsor profile not found for authenticated user');
    }
    return sponsor;
  }

  private async requireOwnedPatient(sponsorId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, sponsorId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${patientId} not found for this sponsor`);
    }
    return patient;
  }

  private riskFromBp(
    systolic: number | null | undefined,
    diastolic: number | null | undefined,
  ): 'green' | 'yellow' | 'red' {
    const sys = systolic ?? 0;
    const dia = diastolic ?? 0;
    if (sys >= 180 || dia >= 120) return 'red';
    if (sys >= 140 || dia >= 90) return 'yellow';
    return 'green';
  }

  async listPatients(actor: AuthUser) {
    const sponsor = await this.requireSponsor(actor);
    const patients = await this.prisma.patient.findMany({
      where: { sponsorId: sponsor.id },
      select: {
        id: true,
        fullName: true,
        city: true,
        pricingZone: true,
        consentStatus: true,
        address: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return patients.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      city: p.city ?? sponsor.city ?? null,
      pricingZone: p.pricingZone ?? sponsor.pricingZone ?? null,
      consentStatus: p.consentStatus,
      address: p.address,
    }));
  }

  async getOnboarding(actor: AuthUser) {
    const sponsor = await this.requireSponsor(actor);
    const patientsCount = await this.prisma.patient.count({
      where: { sponsorId: sponsor.id },
    });
    const active = await this.prisma.subscription.findFirst({
      where: { sponsorId: sponsor.id, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      hasPatient: patientsCount >= 1,
      hasActiveSubscription: Boolean(active),
      patientsCount,
      activeSubscription: active
        ? {
            id: active.id,
            planName: active.planName,
            isActive: active.isActive,
            renewalDate: active.renewalDate.toISOString(),
            allocatedVisits: active.allocatedVisits,
            usedVisits: active.usedVisits,
          }
        : null,
      sponsorCity: sponsor.city ?? null,
      pricingZone: sponsor.pricingZone ?? null,
    };
  }

  async getVitalsTrend(actor: AuthUser, patientId: string, days = 14) {
    const sponsor = await this.requireSponsor(actor);
    await this.requireOwnedPatient(sponsor.id, patientId);

    const since = new Date(Date.now() - Math.max(1, days) * 86400000);
    const visits = await this.prisma.physicalVisit.findMany({
      where: {
        sponsorId: sponsor.id,
        patientId,
        systolicBp: { not: null },
        OR: [
          { actualEnd: { gte: since } },
          { scheduledTime: { gte: since } },
        ],
      },
      orderBy: { scheduledTime: 'asc' },
    });

    return visits.map((v) => ({
      id: v.id,
      recorded_at: (v.actualEnd ?? v.scheduledTime).toISOString(),
      systolic_bp: v.systolicBp ?? 0,
      diastolic_bp: v.diastolicBp ?? 0,
      glucose_fasting: v.bloodSugarMgDl ?? undefined,
      pulse: v.pulseRate ?? 0,
      risk_status: this.riskFromBp(v.systolicBp, v.diastolicBp),
    }));
  }

  async getVisitHistory(actor: AuthUser, patientId: string) {
    const sponsor = await this.requireSponsor(actor);
    await this.requireOwnedPatient(sponsor.id, patientId);

    const visits = await this.prisma.physicalVisit.findMany({
      where: {
        sponsorId: sponsor.id,
        patientId,
        status: {
          in: [
            ServiceStatus.COMPLETED_VERIFIED,
            ServiceStatus.NEEDS_REVIEW,
            ServiceStatus.ESCALATED,
            ServiceStatus.PENDING_CONFIRMATION,
            ServiceStatus.CHECKLIST_COMPLETED,
            ServiceStatus.COMPLETED_UNVERIFIED,
          ],
        },
      },
      include: {
        patient: { select: { fullName: true } },
        chw: { select: { fullName: true } },
      },
      orderBy: { scheduledTime: 'desc' },
      take: 50,
    });

    return visits.map((v) => ({
      id: v.id,
      patient_name: v.patient.fullName,
      visit_date: (v.actualEnd ?? v.scheduledTime).toISOString(),
      chw_name: v.chw.fullName,
      verification_method: v.verificationOtp ? 'OTP' : 'Signature',
    }));
  }

  async getAlerts(actor: AuthUser) {
    const sponsor = await this.requireSponsor(actor);
    const patients = await this.prisma.patient.findMany({
      where: { sponsorId: sponsor.id },
      select: { id: true },
    });
    const patientIds = patients.map((p) => p.id);
    if (patientIds.length === 0) return [];

    const cases = await this.prisma.escalationCase.findMany({
      where: {
        isClosed: false,
        physicalVisit: { patientId: { in: patientIds } },
      },
      include: {
        physicalVisit: {
          include: { patient: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return cases.map((c) => {
      const visit = c.physicalVisit;
      return {
        id: c.id,
        patientName: visit?.patient.fullName ?? 'Unknown patient',
        systolic: visit?.systolicBp ?? 0,
        diastolic: visit?.diastolicBp ?? 0,
        riskStatus:
          c.severity === AlertSeverity.URGENT
            ? ('red' as const)
            : ('yellow' as const),
        status:
          c.resolutionOutcome === 'reviewed'
            ? ('reviewed' as const)
            : ('needs_review' as const),
        clinicianNotes: c.clinicianNotes ?? '',
        createdAt: c.createdAt.toISOString(),
      };
    });
  }
}
