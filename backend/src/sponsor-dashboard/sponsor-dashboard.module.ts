import { Module } from '@nestjs/common';
import { SponsorDashboardController } from './sponsor-dashboard.controller';
import { SponsorDashboardService } from './sponsor-dashboard.service';

@Module({
  controllers: [SponsorDashboardController],
  providers: [SponsorDashboardService],
})
export class SponsorDashboardModule {}
