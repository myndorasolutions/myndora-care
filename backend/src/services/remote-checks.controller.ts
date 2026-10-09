import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ChwActivationLevel, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequireChwActivation } from '../chw-activation/decorators/require-chw-activation.decorator';
import { ChwActivationGuard } from '../chw-activation/guards/chw-activation.guard';
import { ConfirmRemoteCheckDto } from './dto/confirm-remote-check.dto';
import { CreateRemoteCheckDto } from './dto/create-remote-check.dto';
import { RemoteChecksService } from './remote-checks.service';

@Controller('remote-checks')
@UseGuards(ChwActivationGuard)
export class RemoteChecksController {
  constructor(private readonly remoteChecksService: RemoteChecksService) {}

  @Post()
  @Roles(UserRole.CHW)
  @RequireChwActivation(ChwActivationLevel.REMOTE_CHECK_APPROVED)
  create(@Body() dto: CreateRemoteCheckDto, @CurrentUser() user: AuthUser) {
    return this.remoteChecksService.create(dto, user);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.CHW)
  @RequireChwActivation(ChwActivationLevel.REMOTE_CHECK_APPROVED)
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmRemoteCheckDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.remoteChecksService.confirm(id, dto, user);
  }
}
