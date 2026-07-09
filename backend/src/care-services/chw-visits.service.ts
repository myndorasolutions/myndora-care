import { Injectable } from '@nestjs/common';
import { CHWVisitType, VitalSourceType } from '@prisma/client';
import { Request } from 'express';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVitalDto } from '../vitals/dto/create-vital.dto';
import { VitalsService } from '../vitals/services/vitals.service';

@Injectable()
export class ChwVisitsService {
  constructor(
    private readonly vitalsService: VitalsService,
    private readonly prisma: PrismaService,
  ) {}

  async createPhysicalVisit(
    dto: CreateVitalDto & { visit_type?: CHWVisitType; notes?: string },
    actor: AuthUser,
    req: Request,
  ) {
    const vitalPayload: CreateVitalDto = {
      ...dto,
      source_type: VitalSourceType.chw_visit,
    };

    const result = await this.vitalsService.create(vitalPayload, actor, {
      ipAddress: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    });

    const patientId = result.vital.patientId;
    const visit = await this.prisma.cHWVisit.create({
      data: {
        patientId,
        chwId: actor.userId,
        visitType: dto.visit_type ?? CHWVisitType.routine,
        visitDate: new Date(),
        vitalsCaptured: true,
        vitalId: result.vital.id,
        notes: dto.notes ?? '',
      },
    });

    return {
      service_layer: 'physical_chw_visit',
      visit,
      ...result,
    };
  }

  async getVisitHistoryForPatient(patientId: string) {
    const visits = await this.prisma.cHWVisit.findMany({
      where: { patientId },
      include: { patient: true },
      orderBy: { visitDate: 'desc' },
    });

    const chwIds = [...new Set(visits.map((visit) => visit.chwId))];
    const chws = await this.prisma.user.findMany({
      where: { id: { in: chwIds } },
    });
    const chwNames = new Map(chws.map((chw) => [chw.id, chw.fullName]));

    return visits.map((visit) => ({
      id: visit.id,
      patient_name: visit.patient.fullName,
      visit_date: visit.visitDate.toISOString(),
      chw_name: chwNames.get(visit.chwId) ?? 'CHW',
      verification_method: 'Signature' as const,
    }));
  }
}
