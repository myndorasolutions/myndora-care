import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PricingService } from './pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Public()
  @Get('zones')
  listZones() {
    return this.pricingService.listZones();
  }

  @Public()
  @Get('plans')
  listPlans(
    @Query('zone') zone?: string,
    @Query('city') city?: string,
  ) {
    return this.pricingService.listPlans(zone, city);
  }
}
