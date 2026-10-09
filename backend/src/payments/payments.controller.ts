import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initialize')
  @Roles(UserRole.SPONSOR)
  initialize(
    @Body() dto: InitializePaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.paymentsService.initialize(dto, user);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  webhook(@Body() dto: PaymentWebhookDto) {
    return this.paymentsService.handleWebhook(dto);
  }
}
