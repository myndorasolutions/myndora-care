import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class WebhookDataDto {
  @IsString()
  reference!: string;
}

export class PaymentWebhookDto {
  @IsString()
  event!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => WebhookDataDto)
  data!: WebhookDataDto;

  @IsOptional()
  @IsString()
  status?: string;
}
