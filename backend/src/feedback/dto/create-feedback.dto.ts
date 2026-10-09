import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  severity?: string;

  @IsString()
  @MaxLength(2000)
  pageUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  userAgent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400000)
  screenshotBase64?: string;
}
