import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ChwActivationLevel, UserRole } from '@prisma/client';
import { Request } from 'express';
import { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CHW_ACTIVATION_KEY } from '../decorators/require-chw-activation.decorator';
import { meetsActivationLevel } from '../activation-level.util';

@Injectable()
export class ChwActivationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredLevel = this.reflector.getAllAndOverride<ChwActivationLevel>(
      CHW_ACTIVATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredLevel) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (user.role !== UserRole.CHW) {
      throw new ForbiddenException({
        message: 'Only CHW users may submit care services',
        role: user.role,
      });
    }

    const profile = await this.prisma.chwProfile.findUnique({
      where: { userId: user.userId },
    });

    if (!profile) {
      throw new ForbiddenException({
        message: 'CHW profile not found',
        activationLevel: null,
        requiredLevel,
      });
    }

    if (!meetsActivationLevel(profile.activationLevel, requiredLevel)) {
      throw new ForbiddenException({
        message: `CHW activation level ${profile.activationLevel} does not meet required ${requiredLevel}`,
        activationLevel: profile.activationLevel,
        requiredLevel,
      });
    }

    return true;
  }
}
