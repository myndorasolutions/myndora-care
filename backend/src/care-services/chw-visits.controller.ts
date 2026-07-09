import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { CHWVisitType, UserRole } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateVitalDto } from '../vitals/dto/create-vital.dto';
import { ChwVisitsService } from './chw-visits.service';

class CreateChwVisitDto extends CreateVitalDto {
  visit_type?: CHWVisitType;
}

@Controller('chw-visits')
export class ChwVisitsController {
  constructor(private readonly chwVisitsService: ChwVisitsService) {}

  @Post()
  @Roles(UserRole.chw, UserRole.admin, UserRole.clinician)
  create(
    @Body() dto: CreateChwVisitDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.chwVisitsService.createPhysicalVisit(dto, user, req);
  }

  @Get('patient/:patientId')
  @Roles(UserRole.caregiver, UserRole.admin, UserRole.chw)
  getPatientVisits(@Param('patientId') patientId: string) {
    return this.chwVisitsService.getVisitHistoryForPatient(patientId);
  }
}
