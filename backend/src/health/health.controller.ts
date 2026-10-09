import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { resolveEnvironment, resolveMockPaystack } from '../config/environment';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'myndora-care-backend',
      environment: resolveEnvironment(),
      mockPaystack: resolveMockPaystack(),
    };
  }

  @Public()
  @Get('db')
  async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        database: 'unavailable',
        environment: resolveEnvironment(),
      });
    }
    return {
      status: 'ok',
      database: 'connected',
      environment: resolveEnvironment(),
    };
  }
}
