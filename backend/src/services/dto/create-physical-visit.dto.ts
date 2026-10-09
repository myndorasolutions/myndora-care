import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ServiceStatus } from '@prisma/client';

export class CreatePhysicalVisitDto {
  @IsString()
  patientId!: string;

  @IsString()
  sponsorId!: string;

  @IsDateString()
  scheduledTime!: string;

  @IsObject()
  checklistResponses!: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  systolicBp?: number;

  @IsOptional()
  @IsInt()
  diastolicBp?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  pulseRate?: number;

  @IsOptional()
  @IsNumber()
  temperatureCelsius?: number;

  @IsOptional()
  @IsNumber()
  bloodSugarMgDl?: number;

  @IsOptional()
  @IsIn(['fasting', 'random'])
  bloodSugarContext?: 'fasting' | 'random';

  @IsOptional()
  @IsNumber()
  oxygenSaturationPct?: number;

  @IsOptional()
  @IsNumber()
  gpsLatitude?: number;

  @IsOptional()
  @IsNumber()
  gpsLongitude?: number;

  @IsOptional()
  @IsString()
  verificationOtp?: string;

  @IsOptional()
  @IsString()
  syncStatus?: string;

  @IsOptional()
  @IsDateString()
  localOfflineTimestamp?: string;

  @IsOptional()
  @IsString()
  chwObservationNotes?: string;

  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;
}
