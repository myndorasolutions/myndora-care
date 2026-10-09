import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class DevAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const authHeader = request.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (token) {
      request.user = this.parseMockToken(token);
    }

    if (isPublic) {
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const user = request.user!;
    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Account not verified. Complete OTP verification before accessing the API.',
      );
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles?.length && !requiredRoles.includes(user.role)) {
      throw new UnauthorizedException('Insufficient role for this endpoint');
    }

    return true;
  }

  private parseMockToken(token: string): AuthUser {
    if (token.startsWith('mock-jwt-')) {
      const roleKey = token.replace('mock-jwt-', '');
      const role = this.toUserRole(roleKey);
      return {
        userId: `dev-${roleKey}`,
        email: `${roleKey}@myndora.demo`,
        role,
        isVerified: true,
      };
    }

    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[0] ?? token, 'base64url').toString('utf8'),
      ) as {
        uid?: string;
        email?: string | null;
        role?: string;
        verified?: boolean;
      };
      return {
        userId: payload.uid ?? 'dev-chw',
        email: payload.email ?? null,
        role: this.toUserRole(payload.role ?? 'chw'),
        isVerified: payload.verified !== false,
      };
    } catch {
      return {
        userId: 'dev-chw',
        email: 'chw@myndora.demo',
        role: UserRole.CHW,
        isVerified: true,
      };
    }
  }

  private toUserRole(value: string): UserRole {
    const normalized = value.toUpperCase().replace(/-/g, '_');
    const aliases: Record<string, UserRole> = {
      CLINICIAN: UserRole.CLINICIAN_REVIEWER,
      CLINICIAN_REVIEWER: UserRole.CLINICIAN_REVIEWER,
      COORDINATOR: UserRole.ADMIN,
      SPONSOR: UserRole.SPONSOR,
      PATIENT: UserRole.PATIENT,
      CAREGIVER: UserRole.CAREGIVER,
      CHW: UserRole.CHW,
      ADMIN: UserRole.ADMIN,
    };

    if (aliases[normalized]) {
      return aliases[normalized];
    }

    if (Object.values(UserRole).includes(normalized as UserRole)) {
      return normalized as UserRole;
    }

    return UserRole.CHW;
  }
}
