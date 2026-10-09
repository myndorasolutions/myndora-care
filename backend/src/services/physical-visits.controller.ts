import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChwActivationLevel, ServiceStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequireChwActivation } from '../chw-activation/decorators/require-chw-activation.decorator';
import { ChwActivationGuard } from '../chw-activation/guards/chw-activation.guard';
import { CompletePhysicalVisitDto } from './dto/complete-physical-visit.dto';
import { CreatePhysicalVisitDto } from './dto/create-physical-visit.dto';
import { PhysicalVisitsService } from './physical-visits.service';

@Controller('physical-visits')
@UseGuards(ChwActivationGuard)
export class PhysicalVisitsController {
  constructor(private readonly physicalVisitsService: PhysicalVisitsService) {}

  @Get('mine')
  @Roles(UserRole.CHW)
  @RequireChwActivation(ChwActivationLevel.HOME_VISIT_APPROVED)
  listMine(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: ServiceStatus,
  ) {
    return this.physicalVisitsService.listMine(user, status);
  }

  @Get('admin')
  @Roles(UserRole.ADMIN, UserRole.CLINICIAN_REVIEWER)
  listAdmin() {
    return this.physicalVisitsService.listAdminVisitProofs();
  }

  @Get('admin/sync-queue')
  @Roles(UserRole.ADMIN, UserRole.CLINICIAN_REVIEWER)
  listAdminSyncQueue() {
    return this.physicalVisitsService.listAdminSyncQueue();
  }

  @Post()
  @Roles(UserRole.CHW)
  @RequireChwActivation(ChwActivationLevel.HOME_VISIT_APPROVED)
  create(@Body() dto: CreatePhysicalVisitDto, @CurrentUser() user: AuthUser) {
    return this.physicalVisitsService.create(dto, user);
  }

  @Patch(':id/record')
  @Roles(UserRole.CHW)
  @RequireChwActivation(ChwActivationLevel.HOME_VISIT_APPROVED)
  record(
    @Param('id') id: string,
    @Body() dto: CreatePhysicalVisitDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.physicalVisitsService.recordOnVisit(id, dto, user);
  }

  @Patch(':id/complete')
  @Roles(UserRole.CHW)
  @RequireChwActivation(ChwActivationLevel.HOME_VISIT_APPROVED)
  complete(
    @Param('id') id: string,
    @Body() dto: CompletePhysicalVisitDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.physicalVisitsService.complete(id, dto, user);
  }
}
