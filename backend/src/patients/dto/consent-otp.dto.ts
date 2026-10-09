import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class RequestConsentOtpDto {
  @IsOptional()
  @IsIn(['SMS', 'WHATSAPP'])
  channel?: 'SMS' | 'WHATSAPP';
}

export class VerifyConsentOtpDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
