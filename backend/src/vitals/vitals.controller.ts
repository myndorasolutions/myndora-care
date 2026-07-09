import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateVitalDto } from './dto/create-vital.dto';
import { UpdateVitalReviewDto } from './dto/update-vital-review.dto';
import { VitalsService } from './services/vitals.service';

@Controller('vitals')
export class VitalsController {
  constructor(private readonly vitalsService: VitalsService) {}

  @Post()
  @Roles(
    UserRole.patient,
    UserRole.caregiver,
    UserRole.chw,
    UserRole.clinician,
  )
  create(
    @Body() dto: CreateVitalDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    return this.vitalsService.create(dto, user, {
      ipAddress: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    });
  }

  @Get('review-queue')
  @Roles(UserRole.admin, UserRole.clinician)
  getReviewQueue() {
    return this.vitalsService.getReviewQueue();
  }

  @Get('patient/:patientId/trend')
  @Roles(
    UserRole.patient,
    UserRole.caregiver,
    UserRole.admin,
    UserRole.chw,
    UserRole.clinician,
  )
  getTrend(
    @Param('patientId') patientId: string,
    @Query('days') days?: string,
  ) {
    const parsedDays = Number(days ?? 7);
    return this.vitalsService.getTrend(patientId, parsedDays);
  }

  @Patch(':id/review')
  @Roles(UserRole.admin, UserRole.clinician)
  updateReview(@Param('id') id: string, @Body() dto: UpdateVitalReviewDto) {
    return this.vitalsService.updateReview(id, dto);
  }
}
