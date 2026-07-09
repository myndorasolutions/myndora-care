import { ClinicalReviewStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateVitalReviewDto {
  @IsEnum(ClinicalReviewStatus)
  status!: ClinicalReviewStatus;

  @IsOptional()
  @IsString()
  clinician_notes?: string;
}
