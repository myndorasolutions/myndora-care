import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CareServicesModule } from './care-services/care-services.module';
import { DevAuthGuard } from './auth/guards/dev-auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { VitalsModule } from './vitals/vitals.module';

@Module({
  imports: [PrismaModule, VitalsModule, CareServicesModule],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: DevAuthGuard,
    },
  ],
})
export class AppModule {}
