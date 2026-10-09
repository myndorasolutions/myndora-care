import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CompletePhysicalVisitDto {
  @IsOptional()
  @IsString()
  @Length(4, 8)
  verificationOtp?: string;

  @IsBoolean()
  chwAttestationSigned!: boolean;
}
