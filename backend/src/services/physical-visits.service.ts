import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServiceStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ChwActivationService } from '../chw-activation/chw-activation.service';
import { EscalationService } from '../escalation/escalation.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompletePhysicalVisitDto } from './dto/complete-physical-visit.dto';
import { CreatePhysicalVisitDto } from './dto/create-physical-visit.dto';

@Injectable()
export class PhysicalVisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chwActivationService: ChwActivationService,
    private readonly escalationService: EscalationService,
    private readonly auditService: AuditService,
  ) {}

  private async requireChwProfile(actor: AuthUser) {
    const chwProfile = await this.chwActivationService.getProfileByUserId(
      actor.userId,
    );
    if (!chwProfile) {
      throw new ForbiddenException('CHW profile not found for authenticated user');
    }
    return chwProfile;
  }

  async listMine(actor: AuthUser, status?: ServiceStatus) {
    const chwProfile = await this.requireChwProfile(actor);
    return this.prisma.physicalVisit.findMany({
      where: {
        chwId: chwProfile.id,
        ...(status ? { status } : {}),
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            sponsorId: true,
            conditionTags: true,
            preferredLanguage: true,
            address: true,
            consentStatus: true,
          },
        },
        escalations: {
          where: { isClosed: false },
          select: { id: true, severity: true, triggerReason: true },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });
  }

  async create(dto: CreatePhysicalVisitDto, actor: AuthUser) {
    const chwProfile = await this.requireChwProfile(actor);

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${dto.patientId} not found`);
    }
    if (!patient.consentStatus) {
      throw new ForbiddenException({
        message:
          'Patient consent is required before CHW assignment. Complete WhatsApp/SMS OTP verification first.',
        consentStatus: false,
        patientId: dto.patientId,
      });
    }

    const visit = await this.prisma.physicalVisit.create({
      data: {
        sponsorId: dto.sponsorId,
        patientId: dto.patientId,
        chwId: chwProfile.id,
        scheduledTime: new Date(dto.scheduledTime),
        status: dto.status ?? ServiceStatus.CHECKLIST_COMPLETED,
        syncStatus: dto.syncStatus ?? 'SYNCED',
        localOfflineTimestamp: dto.localOfflineTimestamp
          ? new Date(dto.localOfflineTimestamp)
          : undefined,
        gpsLatitude: dto.gpsLatitude,
        gpsLongitude: dto.gpsLongitude,
        verificationOtp: dto.verificationOtp,
        systolicBp: dto.systolicBp,
        diastolicBp: dto.diastolicBp,
        pulseRate: dto.pulseRate,
        temperatureCelsius: dto.temperatureCelsius,
        bloodSugarMgDl: dto.bloodSugarMgDl,
        oxygenSaturationPct: dto.oxygenSaturationPct,
        checklistResponses: dto.checklistResponses as object,
        chwObservationNotes: dto.chwObservationNotes,
        actualStart: new Date(),
        actualEnd: new Date(),
      },
      include: {
        patient: true,
        chw: true,
      },
    });

    await this.auditService.logAuditEvent(
      actor.userId,
      'PHYSICAL_VISIT_CREATE',
      'PhysicalVisit',
      visit.id,
      null,
      visit,
    );

    return this.afterVitalsRecorded(visit, dto, actor);
  }

  /**
   * Fill vitals/checklist on an existing scheduled visit owned by this CHW.
   */
  async recordOnVisit(id: string, dto: CreatePhysicalVisitDto, actor: AuthUser) {
    const chwProfile = await this.requireChwProfile(actor);
    const existing = await this.prisma.physicalVisit.findUnique({
      where: { id },
      include: { patient: true, chw: true },
    });

    if (!existing || existing.chwId !== chwProfile.id) {
      throw new NotFoundException(`Physical visit ${id} not found`);
    }

    const visit = await this.prisma.physicalVisit.update({
      where: { id },
      data: {
        status: ServiceStatus.CHECKLIST_COMPLETED,
        systolicBp: dto.systolicBp,
        diastolicBp: dto.diastolicBp,
        pulseRate: dto.pulseRate,
        temperatureCelsius: dto.temperatureCelsius,
        bloodSugarMgDl: dto.bloodSugarMgDl,
        oxygenSaturationPct: dto.oxygenSaturationPct,
        checklistResponses: dto.checklistResponses as object,
        chwObservationNotes: dto.chwObservationNotes,
        actualStart: existing.actualStart ?? new Date(),
        actualEnd: new Date(),
        syncStatus: dto.syncStatus ?? 'SYNCED',
      },
      include: {
        patient: true,
        chw: true,
      },
    });

    await this.auditService.logAuditEvent(
      actor.userId,
      'PHYSICAL_VISIT_RECORD',
      'PhysicalVisit',
      visit.id,
      existing,
      visit,
    );

    return this.afterVitalsRecorded(visit, dto, actor);
  }

  private async afterVitalsRecorded(
    visit: {
      id: string;
      sponsorId: string;
      patientId: string;
    },
    dto: CreatePhysicalVisitDto,
    actor: AuthUser,
  ) {
    const hasAnyVital =
      dto.systolicBp != null ||
      dto.diastolicBp != null ||
      dto.pulseRate != null ||
      dto.temperatureCelsius != null ||
      dto.bloodSugarMgDl != null ||
      dto.oxygenSaturationPct != null;

    let escalationResult: Awaited<
      ReturnType<EscalationService['handlePhysicalVisitVitals']>
    > = null;

    if (hasAnyVital) {
      const vitalsPayload = {
        systolicBp: dto.systolicBp ?? null,
        diastolicBp: dto.diastolicBp ?? null,
        pulseRate: dto.pulseRate ?? null,
        temperatureCelsius: dto.temperatureCelsius ?? null,
        bloodSugarMgDl: dto.bloodSugarMgDl ?? null,
        bloodSugarContext: dto.bloodSugarContext ?? null,
        oxygenSaturationPct: dto.oxygenSaturationPct ?? null,
      };

      await this.auditService.logAuditEvent(
        actor.userId,
        'VITALS_ENTRY',
        'PhysicalVisit',
        visit.id,
        null,
        vitalsPayload,
      );

      escalationResult = await this.escalationService.handlePhysicalVisitVitals({
        physicalVisitId: visit.id,
        sponsorId: dto.sponsorId || visit.sponsorId,
        patientId: dto.patientId || visit.patientId,
        chwUserId: actor.userId,
        systolicBp: dto.systolicBp,
        diastolicBp: dto.diastolicBp,
        pulseRate: dto.pulseRate,
        temperatureCelsius: dto.temperatureCelsius,
        bloodSugarMgDl: dto.bloodSugarMgDl,
        bloodSugarContext: dto.bloodSugarContext,
        oxygenSaturationPct: dto.oxygenSaturationPct,
      });
    }

    if (escalationResult) {
      const refreshed = await this.prisma.physicalVisit.findUnique({
        where: { id: visit.id },
        include: { patient: true, chw: true, escalations: true },
      });
      return {
        visit: refreshed,
        escalation: escalationResult.escalation,
        sponsorNotification: escalationResult.sponsorNotification,
      };
    }

    const refreshed = await this.prisma.physicalVisit.findUnique({
      where: { id: visit.id },
      include: { patient: true, chw: true, escalations: true },
    });

    return { visit: refreshed ?? visit, escalation: null, sponsorNotification: null };
  }

  async complete(id: string, dto: CompletePhysicalVisitDto, actor: AuthUser) {
    const chwProfile = await this.requireChwProfile(actor);

    const visit = await this.prisma.physicalVisit.findUnique({
      where: { id },
    });

    if (!visit || visit.chwId !== chwProfile.id) {
      throw new NotFoundException(`Physical visit ${id} not found`);
    }

    const verified = Boolean(dto.verificationOtp) || dto.chwAttestationSigned;
    const abnormal =
      visit.status === ServiceStatus.NEEDS_REVIEW ||
      visit.status === ServiceStatus.ESCALATED;

    let status: ServiceStatus;
    if (abnormal) {
      status = ServiceStatus.NEEDS_REVIEW;
    } else if (verified) {
      status = ServiceStatus.COMPLETED_VERIFIED;
    } else {
      status = ServiceStatus.PENDING_CONFIRMATION;
    }

    const updated = await this.prisma.physicalVisit.update({
      where: { id },
      data: {
        verificationOtp: dto.verificationOtp ?? visit.verificationOtp,
        chwAttestationSigned: dto.chwAttestationSigned,
        status,
        actualEnd: new Date(),
      },
    });

    await this.auditService.logAuditEvent(
      actor.userId,
      'PHYSICAL_VISIT_COMPLETE',
      'PhysicalVisit',
      id,
      visit,
      updated,
    );

    return updated;
  }

  /** Admin visit-proof grid: recent visits with vitals for coordinator UI. */
  async listAdminVisitProofs(limit = 50) {
    const visits = await this.prisma.physicalVisit.findMany({
      where: {
        OR: [
          { systolicBp: { not: null } },
          { diastolicBp: { not: null } },
          {
            status: {
              in: [
                ServiceStatus.COMPLETED_VERIFIED,
                ServiceStatus.NEEDS_REVIEW,
                ServiceStatus.ESCALATED,
                ServiceStatus.PENDING_CONFIRMATION,
                ServiceStatus.CHECKLIST_COMPLETED,
              ],
            },
          },
        ],
      },
      include: {
        patient: { select: { fullName: true } },
        chw: { select: { fullName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return visits.map((v) => {
      const hasOtp = Boolean(v.verificationOtp);
      const hasSig = v.chwAttestationSigned;
      const confirmed =
        v.status === ServiceStatus.COMPLETED_VERIFIED ||
        v.status === ServiceStatus.NEEDS_REVIEW ||
        ((hasOtp || hasSig) &&
          v.status !== ServiceStatus.PENDING_CONFIRMATION &&
          v.status !== ServiceStatus.SCHEDULED);

      return {
        id: v.id,
        patient_name: v.patient.fullName,
        chw_name: v.chw.fullName,
        visit_date: (v.actualEnd ?? v.scheduledTime).toISOString(),
        verification_method: hasOtp ? 'OTP' : 'Signature',
        proof_status: confirmed ? 'confirmed' : 'pending',
        systolic_bp: v.systolicBp ?? 0,
        diastolic_bp: v.diastolicBp ?? 0,
        pulse: v.pulseRate ?? undefined,
        recorded_at: (v.actualEnd ?? v.updatedAt).toISOString(),
        signature_state: hasSig ? 'captured' : hasOtp ? 'n/a' : 'pending',
        otp_state: hasOtp ? 'confirmed' : hasSig ? 'n/a' : 'pending',
        status: v.status,
      };
    });
  }

  /**
   * Sync queue: vitals recorded but not yet verified/completed for admin.
   * Excludes COMPLETED_VERIFIED and NEEDS_REVIEW so CHW web submit clears "awaiting upload".
   */
  async listAdminSyncQueue(limit = 50) {
    const visits = await this.prisma.physicalVisit.findMany({
      where: {
        systolicBp: { not: null },
        status: {
          in: [
            ServiceStatus.CHECKLIST_COMPLETED,
            ServiceStatus.PENDING_CONFIRMATION,
            ServiceStatus.IN_PROGRESS,
            ServiceStatus.CONNECTED,
          ],
        },
      },
      include: {
        patient: { select: { fullName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return visits.map((v) => ({
      id: v.id,
      patient_name: v.patient.fullName,
      recorded_at: (v.actualEnd ?? v.updatedAt).toISOString(),
      status:
        v.status === ServiceStatus.PENDING_CONFIRMATION
          ? ('unconfirmed' as const)
          : ('pending' as const),
      detail:
        v.status === ServiceStatus.PENDING_CONFIRMATION
          ? 'Visit awaiting OTP/signature confirmation'
          : 'Vitals recorded — awaiting CHW verification complete',
    }));
  }
}
