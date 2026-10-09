import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import {
  RequestConsentOtpDto,
  VerifyConsentOtpDto,
} from './dto/consent-otp.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { PatientsService } from './patients.service';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(UserRole.SPONSOR)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: AuthUser) {
    return this.patientsService.create(dto, user);
  }

  @Post(':id/consent/request')
  @Roles(UserRole.SPONSOR)
  requestConsent(
    @Param('id') id: string,
    @Body() dto: RequestConsentOtpDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.patientsService.requestConsentOtp(id, dto, user);
  }

  @Post(':id/consent/verify')
  @Roles(UserRole.SPONSOR)
  verifyConsent(
    @Param('id') id: string,
    @Body() dto: VerifyConsentOtpDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.patientsService.verifyConsentOtp(id, dto, user);
  }
}
