import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ChwActivationLevel, PricingZone, UserRole } from '@prisma/client';
import { createHash, randomInt, randomUUID } from 'crypto';
import { isSimulation, resolveMockPaystack } from '../config/environment';
import { PrismaService } from '../prisma/prisma.service';
import { RequestAuthOtpDto, VerifyAuthOtpDto } from './dto/auth-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  private hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private mockOtpEnabled(): boolean {
    return isSimulation() || resolveMockPaystack() || process.env.MOCK_AT === 'true';
  }

  resolvePricingZone(city?: string | null): PricingZone | null {
    if (!city) return null;
    return CITY_ZONE[city] ?? null;
  }

  buildAccessToken(user: {
    id: string;
    email: string | null;
    phoneNumber?: string | null;
    role: UserRole;
    isVerified: boolean;
  }): string {
    const payload = Buffer.from(
      JSON.stringify({
        uid: user.id,
        email: user.email,
        phone: user.phoneNumber,
        role: user.role,
        verified: user.isVerified,
      }),
      'utf8',
    ).toString('base64url');
    return `${payload}.dev`;
  }

  private assertIdentifier(email?: string, phoneNumber?: string) {
    if (!email && !phoneNumber) {
      throw new BadRequestException('Provide email or phoneNumber');
    }
  }

  private async createOtpChallenge(userId: string, channel: 'EMAIL' | 'SMS') {
    const code = String(randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await this.prisma.authOtpChallenge.create({
      data: {
        userId,
        codeHash: this.hashCode(code),
        channel,
        expiresAt,
      },
    });
    return code;
  }

  private async toPublicUser(user: {
    id: string;
    email: string | null;
    phoneNumber: string | null;
    role: UserRole;
    isVerified: boolean;
  }) {
    let fullName: string | null = null;
    let city: string | null = null;
    let pricingZone: string | null = null;

    if (user.role === UserRole.SPONSOR) {
      const sponsor = await this.prisma.sponsor.findUnique({
        where: { userId: user.id },
      });
      fullName = sponsor?.fullName ?? null;
      city = sponsor?.city ?? null;
      pricingZone = sponsor?.pricingZone ?? null;
    } else if (user.role === UserRole.CHW) {
      const chw = await this.prisma.chwProfile.findUnique({
        where: { userId: user.id },
      });
      fullName = chw?.fullName ?? null;
    }

    if (!fullName) {
      fullName =
        user.email?.split('@')[0] ?? user.phoneNumber ?? 'Myndora User';
    }

    return {
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isVerified: user.isVerified,
      fullName,
      city,
      pricingZone,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toPublicUser(user);
  }

  async register(dto: RegisterDto) {
    this.assertIdentifier(dto.email, dto.phoneNumber);

    const roleMap: Record<RegisterDto['role'], UserRole> = {
      SPONSOR: UserRole.SPONSOR,
      CHW: UserRole.CHW,
      PATIENT: UserRole.PATIENT,
      ADMIN: UserRole.ADMIN,
    };
    const role = roleMap[dto.role];

    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException(`Email ${dto.email} is already registered`);
      }
    }

    if (dto.phoneNumber) {
      const phoneTaken = await this.prisma.user.findUnique({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (phoneTaken) {
        throw new ConflictException('Phone number already registered');
      }
    }

    const passwordHash = this.hashPassword(dto.password);
    const fullName =
      dto.fullName ??
      dto.email?.split('@')[0] ??
      dto.phoneNumber ??
      'Myndora User';
    const pricingZone = this.resolvePricingZone(dto.city);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          id: randomUUID(),
          email: dto.email ?? null,
          phoneNumber: dto.phoneNumber ?? null,
          passwordHash,
          role,
          isVerified: false,
        },
      });

      if (role === UserRole.SPONSOR) {
        await tx.sponsor.create({
          data: {
            userId: created.id,
            fullName,
            country: dto.country ?? 'Nigeria',
            city: dto.city ?? null,
            pricingZone,
            notificationPreference: 'ALL',
          },
        });
      } else if (role === UserRole.CHW) {
        const attachmentMeta = (dto.attachmentPaths ?? []).map(
          (path, index) => `attachment:${index}:${path}`,
        );
        await tx.chwProfile.create({
          data: {
            userId: created.id,
            fullName,
            activationLevel: ChwActivationLevel.PENDING_REVIEW,
            serviceAreas: attachmentMeta.length
              ? attachmentMeta
              : dto.city
                ? [dto.city]
                : ['pending-review'],
            languagesSpoken: ['English'],
          },
        });
      }

      return created;
    });

    const channel: 'EMAIL' | 'SMS' = dto.email ? 'EMAIL' : 'SMS';
    const code = await this.createOtpChallenge(user.id, channel);

    return {
      userId: user.id,
      requiresOtp: true,
      channel,
      message: 'Account created. Verify OTP to activate login access.',
      ...(this.mockOtpEnabled() ? { devCode: code } : {}),
    };
  }

  async login(dto: LoginDto) {
    this.assertIdentifier(dto.email, dto.phoneNumber);

    const user = dto.email
      ? await this.prisma.user.findUnique({ where: { email: dto.email } })
      : await this.prisma.user.findUnique({
          where: { phoneNumber: dto.phoneNumber! },
        });

    if (!user || user.passwordHash !== this.hashPassword(dto.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      const channel: 'EMAIL' | 'SMS' = user.email ? 'EMAIL' : 'SMS';
      const code = await this.createOtpChallenge(user.id, channel);
      return {
        userId: user.id,
        requiresOtp: true,
        channel,
        message: 'Account not verified. Submit OTP to complete login.',
        ...(this.mockOtpEnabled() ? { devCode: code } : {}),
      };
    }

    return {
      accessToken: this.buildAccessToken(user),
      requiresOtp: false,
      user: await this.toPublicUser(user),
    };
  }

  async requestOtp(dto: RequestAuthOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const channel =
      dto.channel ?? (user.email ? ('EMAIL' as const) : ('SMS' as const));
    if (channel === 'EMAIL' && !user.email) {
      throw new BadRequestException('User has no email for EMAIL OTP channel');
    }
    if (channel === 'SMS' && !user.phoneNumber) {
      throw new BadRequestException('User has no phone for SMS OTP channel');
    }

    const code = await this.createOtpChallenge(user.id, channel);
    return {
      userId: user.id,
      requiresOtp: true,
      channel,
      message: this.mockOtpEnabled()
        ? 'Mock OTP issued (MOCK_AT/simulation). Use devCode to verify.'
        : 'OTP sent.',
      ...(this.mockOtpEnabled() ? { devCode: code } : {}),
    };
  }

  async verifyOtp(dto: VerifyAuthOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const challenge = await this.prisma.authOtpChallenge.findFirst({
      where: {
        userId: user.id,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge || challenge.codeHash !== this.hashCode(dto.code)) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.authOtpChallenge.update({
        where: { id: challenge.id },
        data: { verifiedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      }),
    ]);

    return {
      accessToken: this.buildAccessToken(updated),
      requiresOtp: false,
      user: await this.toPublicUser(updated),
    };
  }
}
