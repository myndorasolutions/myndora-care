import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { DevAuthGuard } from './auth/guards/dev-auth.guard';
import { ChwActivationModule } from './chw-activation/chw-activation.module';
import { EscalationModule } from './escalation/escalation.module';
import { FeedbackModule } from './feedback/feedback.module';
import { PatientsModule } from './patients/patients.module';
import { PaymentsModule } from './payments/payments.module';
import { PricingModule } from './pricing/pricing.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { ServicesModule } from './services/services.module';
import { SponsorDashboardModule } from './sponsor-dashboard/sponsor-dashboard.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    PatientsModule,
    PaymentsModule,
    PricingModule,
    ChwActivationModule,
    ServicesModule,
    EscalationModule,
    FeedbackModule,
    SponsorDashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: DevAuthGuard,
    },
  ],
})
export class AppModule {}
