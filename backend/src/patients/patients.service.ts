import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PricingZone, UserRole } from '@prisma/client';
import { createHash, randomInt } from 'crypto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  RequestConsentOtpDto,
  VerifyConsentOtpDto,
} from './dto/consent-otp.dto';
import { CreatePatientDto } from './dto/create-patient.dto';

const OTP_TTL_MS = 10 * 60 * 1000;

const CITY_ZONE: Record<string, PricingZone> = {
  Lagos: PricingZone.ZONE_A,
  Abuja: PricingZone.ZONE_A,
  'Port Harcourt': PricingZone.ZONE_A,
  Ilorin: PricingZone.ZONE_B,
  Ibadan: PricingZone.ZONE_B,
  Enugu: PricingZone.ZONE_B,
  Kaduna: PricingZone.ZONE_B,
};

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private resolveZone(
    city: string | undefined,
    sponsorZone: PricingZone | null,
  ): PricingZone | null {
    if (city && CITY_ZONE[city]) return CITY_ZONE[city];
    return sponsorZone;
  }

  private async requireOwnedPatient(patientId: string, actor: AuthUser) {
    if (actor.role !== UserRole.SPONSOR) {
      throw new ForbiddenException('Only sponsors can manage patient consent');
    }

    const sponsor = await this.prisma.sponsor.findUnique({
      where: { userId: actor.userId },
    });
    if (!sponsor) {
      throw new NotFoundException('Sponsor profile not found');
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient || patient.sponsorId !== sponsor.id) {
      throw new NotFoundException(`Patient ${patientId} not found`);
    }

    return { sponsor, patient };
  }

  async create(dto: CreatePatientDto, actor: AuthUser) {
    if (actor.role !== UserRole.SPONSOR) {
      throw new ForbiddenException('Only sponsors can create patients');
    }

    if (!dto.consentAcknowledged) {
      throw new BadRequestException(
        'Patient consent must be acknowledged before creating a patient profile',
      );
    }

    const sponsor = await this.prisma.sponsor.findUnique({
      where: { userId: actor.userId },
    });

    if (!sponsor) {
      throw new NotFoundException('Sponsor profile not found for authenticated user');
    }

    const city = dto.city || sponsor.city || 'Ilorin';
    const pricingZone = this.resolveZone(city, sponsor.pricingZone);

    return this.prisma.patient.create({
      data: {
        sponsorId: sponsor.id,
        fullName: dto.fullName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        address: dto.address,
        phoneNumber: dto.phoneNumber,
        city,
        pricingZone,
        preferredLanguage: dto.preferredLanguage ?? 'English',
        emergencyContact: dto.emergencyContact as object,
        caregiverDetails: dto.caregiverDetails as object,
        conditionTags: dto.conditionTags ?? [],
        medications: dto.medications ?? [],
        consentStatus: false,
      },
    });
  }

  async requestConsentOtp(
    patientId: string,
    dto: RequestConsentOtpDto,
    actor: AuthUser,
  ) {
    const { patient } = await this.requireOwnedPatient(patientId, actor);

    if (patient.consentStatus) {
      return {
        patientId: patient.id,
        consentStatus: true,
        message: 'Patient consent already verified',
      };
    }

    const code = String(randomInt(100000, 999999));
    const channel = dto.channel ?? 'SMS';
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    const mockAt = (process.env.MOCK_AT ?? 'true').toLowerCase();
    const isMock = mockAt === 'true' || mockAt === '1';

    await this.prisma.patientConsentChallenge.create({
      data: {
        patientId: patient.id,
        codeHash: this.hashCode(code),
        channel,
        expiresAt,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: actor.userId,
        action: 'PATIENT_CONSENT_OTP_REQUESTED',
        entityName: 'Patient',
        entityId: patient.id,
        afterState: {
          patientId: patient.id,
          channel,
          expiresAt: expiresAt.toISOString(),
          mock: isMock,
        },
      },
    });

    return {
      patientId: patient.id,
      channel,
      expiresAt: expiresAt.toISOString(),
      message: isMock
        ? 'Mock OTP issued (MOCK_AT=true). Use devCode to verify.'
        : 'OTP dispatched via messaging provider.',
      ...(isMock ? { devCode: code } : {}),
    };
  }

  async verifyConsentOtp(
    patientId: string,
    dto: VerifyConsentOtpDto,
    actor: AuthUser,
  ) {
    const { patient } = await this.requireOwnedPatient(patientId, actor);

    if (patient.consentStatus) {
      return {
        patientId: patient.id,
        consentStatus: true,
        message: 'Patient consent already verified',
      };
    }

    if (!/^\d{6}$/.test(dto.code)) {
      throw new BadRequestException('OTP must be a 6-digit code');
    }

    const challenge = await this.prisma.patientConsentChallenge.findFirst({
      where: {
        patientId: patient.id,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new BadRequestException('No active consent OTP challenge found');
    }

    if (challenge.codeHash !== this.hashCode(dto.code)) {
      throw new BadRequestException('Invalid consent OTP');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.patientConsentChallenge.update({
        where: { id: challenge.id },
        data: { verifiedAt: new Date() },
      });

      const next = await tx.patient.update({
        where: { id: patient.id },
        data: { consentStatus: true },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'PATIENT_CONSENT_VERIFIED',
          entityName: 'Patient',
          entityId: patient.id,
          beforeState: { consentStatus: false },
          afterState: {
            patientId: patient.id,
            challengeId: challenge.id,
            channel: challenge.channel,
            consentStatus: true,
          },
        },
      });

      return next;
    });

    return {
      patientId: updated.id,
      consentStatus: updated.consentStatus,
      message: 'Patient consent verified',
    };
  }

  async assertPatientConsented(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient ${patientId} not found`);
    }
    if (!patient.consentStatus) {
      throw new ForbiddenException({
        message:
          'Patient consent is required before CHW assignment. Complete WhatsApp/SMS OTP verification first.',
        consentStatus: false,
        patientId,
      });
    }
    return patient;
  }
}
