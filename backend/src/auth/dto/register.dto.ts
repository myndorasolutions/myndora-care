import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @ValidateIf((o: RegisterDto) => !o.phoneNumber)
  @IsEmail()
  email?: string;

  @ValidateIf((o: RegisterDto) => !o.email)
  @IsString()
  @MinLength(7)
  phoneNumber?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn(['SPONSOR', 'CHW', 'PATIENT', 'ADMIN'])
  role!: 'SPONSOR' | 'CHW' | 'PATIENT' | 'ADMIN';

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  /** Dummy attachment paths for CHW onboarding (stored on profile metadata fields). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentPaths?: string[];
}
