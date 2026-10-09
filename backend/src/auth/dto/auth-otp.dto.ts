import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class RequestAuthOtpDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsIn(['EMAIL', 'SMS'])
  channel?: 'EMAIL' | 'SMS';
}

export class VerifyAuthOtpDto {
  @IsString()
  userId!: string;

  @IsString()
  @Length(4, 6)
  code!: string;
}
