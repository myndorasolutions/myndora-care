import { Module } from '@nestjs/common';
import { ChwActivationController } from './chw-activation.controller';
import { ChwActivationService } from './chw-activation.service';
import { ChwActivationGuard } from './guards/chw-activation.guard';

@Module({
  controllers: [ChwActivationController],
  providers: [ChwActivationService, ChwActivationGuard],
  exports: [ChwActivationService, ChwActivationGuard],
})
export class ChwActivationModule {}
