import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { SponsorDashboardService } from './sponsor-dashboard.service';

@Controller('sponsors/me')
export class SponsorDashboardController {
  constructor(private readonly sponsorDashboardService: SponsorDashboardService) {}

  @Get('alerts')
  @Roles(UserRole.SPONSOR)
  getAlerts(@CurrentUser() user: AuthUser) {
    return this.sponsorDashboardService.getAlerts(user);
  }

  @Get('patients')
  @Roles(UserRole.SPONSOR)
  listPatients(@CurrentUser() user: AuthUser) {
    return this.sponsorDashboardService.listPatients(user);
  }

  @Get('onboarding')
  @Roles(UserRole.SPONSOR)
  getOnboarding(@CurrentUser() user: AuthUser) {
    return this.sponsorDashboardService.getOnboarding(user);
  }

  @Get('patients/:patientId/vitals-trend')
  @Roles(UserRole.SPONSOR)
  getVitalsTrend(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
    @Query('days') days?: string,
  ) {
    const parsed = days ? Number.parseInt(days, 10) : 14;
    return this.sponsorDashboardService.getVitalsTrend(
      user,
      patientId,
      Number.isFinite(parsed) ? parsed : 14,
    );
  }

  @Get('patients/:patientId/visits')
  @Roles(UserRole.SPONSOR)
  getVisits(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
  ) {
    return this.sponsorDashboardService.getVisitHistory(user, patientId);
  }
}
