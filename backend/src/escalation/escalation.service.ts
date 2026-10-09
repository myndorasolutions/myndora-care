import { Injectable } from '@nestjs/common';
import {
  AlertSeverity,
  ServiceStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export type BloodSugarContext = 'fasting' | 'random';

export interface VitalEvaluation {
  severity: AlertSeverity;
  triggerReason: string;
  breaches: string[];
}

export interface SponsorNotificationPayload {
  sponsorId: string;
  patientId: string;
  physicalVisitId: string;
  escalationCaseId: string;
  severity: AlertSeverity;
  message: string;
}

export interface HandlePhysicalVisitVitalsResult {
  escalation: {
    id: string;
    severity: AlertSeverity;
    triggerReason: string;
  };
  sponsorNotification: SponsorNotificationPayload;
}

export interface VitalsInput {
  systolicBp?: number | null;
  diastolicBp?: number | null;
  pulseRate?: number | null;
  temperatureCelsius?: number | null;
  bloodSugarMgDl?: number | null;
  bloodSugarContext?: BloodSugarContext | null;
  oxygenSaturationPct?: number | null;
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  [AlertSeverity.URGENT]: 0,
  [AlertSeverity.NEEDS_REVIEW]: 1,
  [AlertSeverity.CAUTION]: 2,
  [AlertSeverity.NORMAL]: 3,
};

function worseSeverity(
  a: AlertSeverity | null,
  b: AlertSeverity,
): AlertSeverity {
  if (!a) {
    return b;
  }
  return SEVERITY_ORDER[b] < SEVERITY_ORDER[a] ? b : a;
}

@Injectable()
export class EscalationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  evaluateVitals(input: VitalsInput): VitalEvaluation | null {
    const breaches: string[] = [];
    let severity: AlertSeverity | null = null;

    if (input.systolicBp != null && input.diastolicBp != null) {
      const sys = input.systolicBp;
      const dia = input.diastolicBp;
      if (sys >= 140 || dia >= 90) {
        severity = worseSeverity(severity, AlertSeverity.URGENT);
        breaches.push(`BP ${sys}/${dia} exceeds urgent threshold`);
      } else if (
        (sys >= 130 && sys <= 139) ||
        (dia >= 85 && dia <= 89)
      ) {
        severity = worseSeverity(severity, AlertSeverity.CAUTION);
        breaches.push(`BP ${sys}/${dia} exceeds caution threshold`);
      }
    }

    if (input.bloodSugarMgDl != null) {
      const val = input.bloodSugarMgDl;
      const context: BloodSugarContext =
        input.bloodSugarContext === 'fasting' ? 'fasting' : 'random';

      if (context === 'fasting') {
        if (val >= 126 || val <= 70) {
          severity = worseSeverity(severity, AlertSeverity.URGENT);
          breaches.push(
            `Fasting blood sugar ${val} mg/dL exceeds urgent threshold`,
          );
        } else if (val >= 100 && val <= 125) {
          severity = worseSeverity(severity, AlertSeverity.CAUTION);
          breaches.push(
            `Fasting blood sugar ${val} mg/dL exceeds caution threshold`,
          );
        }
      } else if (val >= 200 || val <= 70) {
        severity = worseSeverity(severity, AlertSeverity.URGENT);
        breaches.push(
          `Random blood sugar ${val} mg/dL exceeds urgent threshold`,
        );
      } else if (val >= 140 && val <= 199) {
        severity = worseSeverity(severity, AlertSeverity.CAUTION);
        breaches.push(
          `Random blood sugar ${val} mg/dL exceeds caution threshold`,
        );
      }
    }

    if (input.pulseRate != null) {
      const val = input.pulseRate;
      if (val >= 120 || val < 50) {
        severity = worseSeverity(severity, AlertSeverity.URGENT);
        breaches.push(`Pulse ${val} bpm exceeds urgent threshold`);
      } else if (
        (val >= 101 && val <= 119) ||
        (val >= 50 && val <= 59)
      ) {
        severity = worseSeverity(severity, AlertSeverity.CAUTION);
        breaches.push(`Pulse ${val} bpm exceeds caution threshold`);
      }
    }

    if (input.temperatureCelsius != null) {
      const val = input.temperatureCelsius;
      if (val >= 38.5 || val < 35.0) {
        severity = worseSeverity(severity, AlertSeverity.URGENT);
        breaches.push(
          `Temperature ${val}°C exceeds urgent threshold`,
        );
      } else if (val >= 37.6 && val <= 38.4) {
        severity = worseSeverity(severity, AlertSeverity.CAUTION);
        breaches.push(
          `Temperature ${val}°C exceeds caution threshold`,
        );
      }
    }

    if (input.oxygenSaturationPct != null) {
      const val = input.oxygenSaturationPct;
      if (val <= 92) {
        severity = worseSeverity(severity, AlertSeverity.URGENT);
        breaches.push(`SpO2 ${val}% exceeds urgent threshold`);
      } else if (val === 93 || val === 94) {
        severity = worseSeverity(severity, AlertSeverity.CAUTION);
        breaches.push(`SpO2 ${val}% exceeds caution threshold`);
      }
    }

    if (!severity || breaches.length === 0) {
      return null;
    }

    return {
      severity,
      triggerReason: breaches.join('; '),
      breaches,
    };
  }

  /** @deprecated Prefer evaluateVitals — kept for callers that only pass BP. */
  evaluateBloodPressure(
    systolicBp: number,
    diastolicBp: number,
  ): VitalEvaluation | null {
    return this.evaluateVitals({ systolicBp, diastolicBp });
  }

  async handlePhysicalVisitVitals(params: {
    physicalVisitId: string;
    sponsorId: string;
    patientId: string;
    chwUserId: string;
    systolicBp?: number | null;
    diastolicBp?: number | null;
    pulseRate?: number | null;
    temperatureCelsius?: number | null;
    bloodSugarMgDl?: number | null;
    bloodSugarContext?: BloodSugarContext | null;
    oxygenSaturationPct?: number | null;
  }): Promise<HandlePhysicalVisitVitalsResult | null> {
    const evaluation = this.evaluateVitals({
      systolicBp: params.systolicBp,
      diastolicBp: params.diastolicBp,
      pulseRate: params.pulseRate,
      temperatureCelsius: params.temperatureCelsius,
      bloodSugarMgDl: params.bloodSugarMgDl,
      bloodSugarContext: params.bloodSugarContext,
      oxygenSaturationPct: params.oxygenSaturationPct,
    });

    if (!evaluation) {
      return null;
    }

    const visitStatus =
      evaluation.severity === AlertSeverity.URGENT
        ? ServiceStatus.ESCALATED
        : ServiceStatus.NEEDS_REVIEW;

    const severityLabel =
      evaluation.severity === AlertSeverity.URGENT ? 'Urgent' : 'Caution';
    const notificationMessage = `Template C: ${severityLabel}: ${evaluation.triggerReason}`;

    const beforeVisit = await this.prisma.physicalVisit.findUnique({
      where: { id: params.physicalVisitId },
      select: { status: true },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.escalationCase.create({
        data: {
          physicalVisitId: params.physicalVisitId,
          triggerReason: evaluation.triggerReason,
          severity: evaluation.severity,
        },
      });

      await tx.physicalVisit.update({
        where: { id: params.physicalVisitId },
        data: { status: visitStatus },
      });

      await this.auditService.logAuditEvent(
        params.chwUserId,
        'ESCALATION_CASE_CREATE',
        'EscalationCase',
        created.id,
        null,
        {
          ...created,
          breaches: evaluation.breaches,
          patientId: params.patientId,
          sponsorId: params.sponsorId,
        },
        tx,
      );

      await this.auditService.logAuditEvent(
        params.chwUserId,
        'PHYSICAL_VISIT_STATUS_CHANGE',
        'PhysicalVisit',
        params.physicalVisitId,
        beforeVisit,
        { status: visitStatus },
        tx,
      );

      const sponsorNotification: SponsorNotificationPayload = {
        sponsorId: params.sponsorId,
        patientId: params.patientId,
        physicalVisitId: params.physicalVisitId,
        escalationCaseId: created.id,
        severity: evaluation.severity,
        message: notificationMessage,
      };

      await this.auditService.logAuditEvent(
        params.chwUserId,
        'SPONSOR_DASHBOARD_NOTIFY',
        'EscalationCase',
        created.id,
        null,
        sponsorNotification,
        tx,
      );

      return {
        escalation: {
          id: created.id,
          severity: created.severity,
          triggerReason: created.triggerReason,
        },
        sponsorNotification,
      };
    });

    return result;
  }

  async getReviewQueue() {
    const cases = await this.prisma.escalationCase.findMany({
      where: {
        isClosed: false,
        severity: {
          in: [
            AlertSeverity.URGENT,
            AlertSeverity.NEEDS_REVIEW,
            AlertSeverity.CAUTION,
          ],
        },
      },
      include: {
        physicalVisit: {
          include: { patient: true, chw: true },
        },
        remoteCheck: {
          include: { patient: true, chw: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sorted = cases.sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    );

    return sorted.map((c) => this.toFlaggedVitalReview(c));
  }

  async updateReview(
    id: string,
    body: {
      status: 'needs_review' | 'reviewed' | 'closed';
      clinician_notes?: string;
    },
    actorUserId: string,
  ) {
    const existing = await this.prisma.escalationCase.findUnique({
      where: { id },
      include: {
        physicalVisit: { include: { patient: true } },
        remoteCheck: { include: { patient: true } },
      },
    });
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.escalationCase.update({
      where: { id },
      data: {
        clinicianNotes: body.clinician_notes ?? existing.clinicianNotes,
        resolutionOutcome:
          body.status === 'needs_review'
            ? null
            : body.status === 'reviewed'
              ? 'reviewed'
              : 'closed',
        isClosed: body.status === 'closed',
      },
      include: {
        physicalVisit: { include: { patient: true } },
        remoteCheck: { include: { patient: true } },
      },
    });

    await this.auditService.logAuditEvent(
      actorUserId,
      'ESCALATION_REVIEW_UPDATE',
      'EscalationCase',
      id,
      existing,
      updated,
    );

    return this.toFlaggedVitalReview(updated);
  }

  private toFlaggedVitalReview(c: {
    id: string;
    severity: AlertSeverity;
    triggerReason: string;
    clinicianNotes: string | null;
    resolutionOutcome: string | null;
    isClosed: boolean;
    createdAt: Date;
    physicalVisit: {
      patientId: string;
      systolicBp: number | null;
      diastolicBp: number | null;
      pulseRate: number | null;
      temperatureCelsius: number | null;
      bloodSugarMgDl: number | null;
      patient: { id: string; fullName: string } | null;
    } | null;
    remoteCheck: {
      patientId: string;
      patient: { id: string; fullName: string } | null;
    } | null;
  }) {
    const visit = c.physicalVisit;
    const remote = c.remoteCheck;
    const patientName =
      visit?.patient?.fullName ?? remote?.patient?.fullName ?? 'Unknown patient';
    const patientId =
      visit?.patientId ??
      visit?.patient?.id ??
      remote?.patientId ??
      remote?.patient?.id ??
      null;
    const systolic = visit?.systolicBp ?? 0;
    const diastolic = visit?.diastolicBp ?? 0;

    let status: 'needs_review' | 'reviewed' | 'closed' = 'needs_review';
    if (c.isClosed) status = 'closed';
    else if (c.resolutionOutcome === 'reviewed') status = 'reviewed';

    return {
      id: c.id,
      patientName,
      patientId,
      systolic,
      diastolic,
      pulse: visit?.pulseRate ?? null,
      temperatureCelsius: visit?.temperatureCelsius ?? null,
      bloodSugarMgDl: visit?.bloodSugarMgDl ?? null,
      severity: c.severity,
      triggerReason: c.triggerReason,
      riskStatus:
        c.severity === AlertSeverity.URGENT
          ? ('red' as const)
          : ('yellow' as const),
      status,
      clinicianNotes: c.clinicianNotes ?? '',
      createdAt: c.createdAt.toISOString(),
    };
  }
}
