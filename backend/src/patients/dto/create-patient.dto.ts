import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EmergencyContactDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  relationship?: string;
}

export class NextOfKinDto {
  @IsString()
  name!: string;

  @IsString()
  phone!: string;

  @IsString()
  address!: string;
}

export class CreatePatientDto {
  @IsString()
  fullName!: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsString()
  gender!: string;

  @IsString()
  address!: string;

  @IsString()
  phoneNumber!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact!: EmergencyContactDto;

  @IsObject()
  @ValidateNested()
  @Type(() => NextOfKinDto)
  caregiverDetails!: NextOfKinDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditionTags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medications?: string[];

  @IsBoolean()
  consentAcknowledged!: boolean;
}
