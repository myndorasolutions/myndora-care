import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CaptureLocationType,
  ClinicalReviewStatus,
  RiskStatus,
  VitalSourceType,
} from '@prisma/client';
import { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateRiskStatus, CreateVitalDto } from '../dto/create-vital.dto';
import { UpdateVitalReviewDto } from '../dto/update-vital-review.dto';

interface CreateContext {
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class VitalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVitalDto, actor: AuthUser, _ctx: CreateContext) {
    const patientId = dto.patient_id ?? actor.userId;
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient not found: ${patientId}`);
    }

    const riskStatus = calculateRiskStatus(dto.systolic_bp, dto.diastolic_bp);
    const vital = await this.prisma.vital.create({
      data: {
        patientId,
        systolicBp: dto.systolic_bp,
        diastolicBp: dto.diastolic_bp,
        pulse: dto.pulse,
        glucoseFasting: dto.glucose_fasting,
        glucoseRandom: dto.glucose_random,
        weightKg: dto.weight_kg,
        symptoms: dto.symptoms ?? [],
        medicationTaken: dto.medication_taken ?? false,
        notes: dto.notes,
        riskStatus,
        sourceType: dto.source_type ?? VitalSourceType.patient_self,
        capturedByUserId: actor.userId,
        captureLocationType:
          dto.capture_location_type ?? CaptureLocationType.unknown,
        clinicalReviewStatus:
          riskStatus === RiskStatus.green
            ? ClinicalReviewStatus.reviewed
            : ClinicalReviewStatus.needs_review,
      },
    });

    return {
      vital,
      risk_status: riskStatus,
    };
  }

  async getTrend(patientId: string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const vitals = await this.prisma.vital.findMany({
      where: {
        patientId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
    });

    return vitals.map((vital) => ({
      id: vital.id,
      recorded_at: vital.createdAt.toISOString(),
      systolic_bp: vital.systolicBp ?? 0,
      diastolic_bp: vital.diastolicBp ?? 0,
      glucose_fasting: vital.glucoseFasting ?? undefined,
      pulse: vital.pulse ?? 0,
      risk_status: vital.riskStatus,
    }));
  }

  async getReviewQueue() {
    const vitals = await this.prisma.vital.findMany({
      where: {
        riskStatus: { in: [RiskStatus.yellow, RiskStatus.red] },
      },
      include: { patient: true },
      orderBy: { createdAt: 'desc' },
    });

    return vitals.map((vital) => ({
      id: vital.id,
      patientName: vital.patient.fullName,
      systolic: vital.systolicBp ?? 0,
      diastolic: vital.diastolicBp ?? 0,
      riskStatus: vital.riskStatus,
      status: vital.clinicalReviewStatus,
      clinicianNotes: vital.clinicianNotes ?? '',
      createdAt: vital.createdAt.toISOString(),
    }));
  }

  async updateReview(id: string, dto: UpdateVitalReviewDto) {
    const existing = await this.prisma.vital.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Vital not found: ${id}`);
    }

    const vital = await this.prisma.vital.update({
      where: { id },
      data: {
        clinicalReviewStatus: dto.status,
        clinicianNotes: dto.clinician_notes ?? existing.clinicianNotes,
      },
      include: { patient: true },
    });

    return {
      id: vital.id,
      patientName: vital.patient.fullName,
      systolic: vital.systolicBp ?? 0,
      diastolic: vital.diastolicBp ?? 0,
      riskStatus: vital.riskStatus,
      status: vital.clinicalReviewStatus,
      clinicianNotes: vital.clinicianNotes ?? '',
      createdAt: vital.createdAt.toISOString(),
    };
  }
}
