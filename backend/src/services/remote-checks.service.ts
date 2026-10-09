import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServiceStatus } from '@prisma/client';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ChwActivationService } from '../chw-activation/chw-activation.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmRemoteCheckDto } from './dto/confirm-remote-check.dto';
import { CreateRemoteCheckDto } from './dto/create-remote-check.dto';

@Injectable()
export class RemoteChecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chwActivationService: ChwActivationService,
  ) {}

  async create(dto: CreateRemoteCheckDto, actor: AuthUser) {
    const chwProfile = await this.chwActivationService.getProfileByUserId(
      actor.userId,
    );

    if (!chwProfile) {
      throw new ForbiddenException('CHW profile not found for authenticated user');
    }

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

    return this.prisma.remoteCheck.create({
      data: {
        sponsorId: dto.sponsorId,
        patientId: dto.patientId,
        chwId: chwProfile.id,
        scheduledTime: new Date(dto.scheduledTime),
        callMethod: dto.callMethod ?? 'IN_APP',
        callDurationSeconds: dto.callDurationSeconds ?? 0,
        status: dto.status ?? ServiceStatus.CHECKLIST_COMPLETED,
        checklistResponses: dto.checklistResponses as object,
        medicationStatusNotes: dto.medicationStatusNotes,
        chwObservationNotes: dto.chwObservationNotes,
        actualStart: new Date(),
        actualEnd: new Date(),
      },
      include: {
        patient: true,
        chw: true,
      },
    });
  }

  async confirm(id: string, dto: ConfirmRemoteCheckDto, actor: AuthUser) {
    const chwProfile = await this.chwActivationService.getProfileByUserId(
      actor.userId,
    );

    if (!chwProfile) {
      throw new ForbiddenException('CHW profile not found for authenticated user');
    }

    const remoteCheck = await this.prisma.remoteCheck.findUnique({
      where: { id },
    });

    if (!remoteCheck || remoteCheck.chwId !== chwProfile.id) {
      throw new NotFoundException(`Remote check ${id} not found`);
    }

    return this.prisma.remoteCheck.update({
      where: { id },
      data: {
        patientConfirmationOtp: dto.patientConfirmationOtp,
        isConfirmed: true,
        status: ServiceStatus.COMPLETED_VERIFIED,
      },
    });
  }
}
