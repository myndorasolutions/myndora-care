import { IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class InitializePaymentDto {
  @ValidateIf((o: InitializePaymentDto) => !o.planName)
  @IsNumber()
  @Min(100)
  amountNaira!: number;

  @IsOptional()
  @IsString()
  planName?: string;

  @IsOptional()
  @IsString()
  patientId?: string;
}
