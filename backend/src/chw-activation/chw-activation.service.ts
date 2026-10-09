import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChwActivationLevel, UserRole } from '@prisma/client';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateChwActivationDto,
  VettingScorecardDto,
} from './dto/update-chw-activation.dto';

@Injectable()
export class ChwActivationService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfileForUser(user: AuthUser) {
    if (user.role !== UserRole.CHW) {
      throw new ForbiddenException('Only CHW users have a CHW profile');
    }

    const profile = await this.prisma.chwProfile.findUnique({
      where: { userId: user.userId },
    });

    if (!profile) {
      throw new NotFoundException('CHW profile not found');
    }

    return profile;
  }

  private assertScorecardComplete(scorecard: VettingScorecardDto) {
    const keys: (keyof VettingScorecardDto)[] = [
      'identityDocument',
      'ninVerification',
      'referenceOne',
      'referenceTwo',
      'trainingCompetency',
    ];
    for (const key of keys) {
      const value = scorecard[key];
      if (typeof value !== 'number' || value < 1 || value > 5) {
        throw new BadRequestException(
          `Vetting scorecard field ${key} must be an integer from 1 to 5`,
        );
      }
    }
  }

  async updateActivationByAdmin(
    dto: UpdateChwActivationDto,
    actor: AuthUser,
  ) {
    const profile = await this.prisma.chwProfile.findUnique({
      where: { id: dto.chwProfileId },
    });

    if (!profile) {
      throw new NotFoundException(`CHW profile ${dto.chwProfileId} not found`);
    }

    if (dto.activationLevel === ChwActivationLevel.HOME_VISIT_APPROVED) {
      if (!dto.vettingScorecard) {
        throw new BadRequestException(
          'vettingScorecard (5-point reference scorecard) is required before HOME_VISIT_APPROVED',
        );
      }
      this.assertScorecardComplete(dto.vettingScorecard);
    } else if (dto.vettingScorecard) {
      this.assertScorecardComplete(dto.vettingScorecard);
    }

    const previousLevel = profile.activationLevel;
    const reviewedAt = new Date().toISOString();
    const scorecardPayload = dto.vettingScorecard
      ? {
          ...dto.vettingScorecard,
          reviewedAt,
          reviewedByUserId: actor.userId,
        }
      : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.chwProfile.update({
        where: { id: profile.id },
        data: {
          activationLevel: dto.activationLevel,
          ninStatus: dto.ninStatus ?? profile.ninStatus,
          identityVerified: dto.identityVerified ?? profile.identityVerified,
          referencesChecked:
            dto.referencesChecked ?? profile.referencesChecked,
          trainingCompleted:
            dto.trainingCompleted ?? profile.trainingCompleted,
          ...(scorecardPayload
            ? { vettingScorecard: scorecardPayload }
            : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'CHW_ACTIVATION_UPDATED',
          entityName: 'ChwProfile',
          entityId: next.id,
          beforeState: { activationLevel: previousLevel },
          afterState: {
            chwProfileId: next.id,
            previousLevel,
            activationLevel: next.activationLevel,
            updatedBy: actor.userId,
          },
        },
      });

      if (scorecardPayload) {
        await tx.auditLog.create({
          data: {
            actorId: actor.userId,
            action: 'CHW_VETTING_SCORECARD',
            entityName: 'ChwProfile',
            entityId: next.id,
            afterState: {
              chwProfileId: next.id,
              scorecard: scorecardPayload,
              activationLevel: next.activationLevel,
            },
          },
        });
      }

      return next;
    });

    return updated;
  }

  async getProfileByUserId(userId: string) {
    return this.prisma.chwProfile.findUnique({ where: { userId } });
  }

  async listAdminProfiles() {
    const profiles = await this.prisma.chwProfile.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        userId: true,
        fullName: true,
        activationLevel: true,
        ninStatus: true,
        identityVerified: true,
        referencesChecked: true,
        trainingCompleted: true,
        serviceAreas: true,
        languagesSpoken: true,
        vettingScorecard: true,
        ratingAverage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return profiles;
  }

  async listAssignedPatients(user: AuthUser) {
    if (user.role !== UserRole.CHW) {
      throw new ForbiddenException('Only CHW users can list assigned patients');
    }

    const profile = await this.getProfileByUserId(user.userId);
    if (!profile) {
      throw new NotFoundException('CHW profile not found');
    }

    const visited = await this.prisma.physicalVisit.findMany({
      where: { chwId: profile.id },
      select: { patientId: true },
      distinct: ['patientId'],
    });
    const visitedIds = visited.map((v) => v.patientId);

    return this.prisma.patient.findMany({
      where: {
        OR: [
          { consentStatus: true },
          ...(visitedIds.length ? [{ id: { in: visitedIds } }] : []),
        ],
      },
      select: {
        id: true,
        fullName: true,
        sponsorId: true,
        conditionTags: true,
        preferredLanguage: true,
        address: true,
        consentStatus: true,
        dateOfBirth: true,
        gender: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }
}
