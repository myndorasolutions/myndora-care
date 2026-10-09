import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ServiceStatus } from '@prisma/client';

export class CreateRemoteCheckDto {
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
  @Min(0)
  callDurationSeconds?: number;

  @IsOptional()
  @IsString()
  medicationStatusNotes?: string;

  @IsOptional()
  @IsString()
  chwObservationNotes?: string;

  @IsOptional()
  @IsString()
  callMethod?: string;

  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;
}
