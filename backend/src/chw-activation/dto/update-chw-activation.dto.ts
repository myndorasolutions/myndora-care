import { ChwActivationLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class VettingScorecardDto {
  @IsInt()
  @Min(1)
  @Max(5)
  identityDocument!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  ninVerification!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  referenceOne!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  referenceTwo!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  trainingCompetency!: number;

  @IsOptional()
  @IsString()
  coordinatorNotes?: string;
}

export class UpdateChwActivationDto {
  @IsString()
  chwProfileId!: string;

  @IsEnum(ChwActivationLevel)
  activationLevel!: ChwActivationLevel;

  @IsOptional()
  @IsBoolean()
  ninStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  identityVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  referencesChecked?: boolean;

  @IsOptional()
  @IsBoolean()
  trainingCompleted?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => VettingScorecardDto)
  vettingScorecard?: VettingScorecardDto;
}
