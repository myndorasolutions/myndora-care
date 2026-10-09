import { IsOptional, IsString, MinLength, ValidateIf, IsEmail } from 'class-validator';

export class LoginDto {
  @ValidateIf((o: LoginDto) => !o.phoneNumber)
  @IsEmail()
  email?: string;

  @ValidateIf((o: LoginDto) => !o.email)
  @IsString()
  @MinLength(7)
  phoneNumber?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
