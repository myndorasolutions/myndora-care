import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ChwActivationService } from './chw-activation.service';
import { UpdateChwActivationDto } from './dto/update-chw-activation.dto';

@Controller('chw')
export class ChwActivationController {
  constructor(private readonly chwActivationService: ChwActivationService) {}

  @Get('profile')
  @Roles(UserRole.CHW)
  getProfile(@CurrentUser() user: AuthUser) {
    return this.chwActivationService.getProfileForUser(user);
  }

  @Get('patients')
  @Roles(UserRole.CHW)
  listPatients(@CurrentUser() user: AuthUser) {
    return this.chwActivationService.listAssignedPatients(user);
  }

  @Get('admin/profiles')
  @Roles(UserRole.ADMIN)
  listAdminProfiles() {
    return this.chwActivationService.listAdminProfiles();
  }

  @Patch('activation')
  @Roles(UserRole.ADMIN)
  updateActivation(
    @Body() dto: UpdateChwActivationDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chwActivationService.updateActivationByAdmin(dto, user);
  }
}
