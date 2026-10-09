import { Module } from '@nestjs/common';
import { ChwActivationModule } from '../chw-activation/chw-activation.module';
import { EscalationModule } from '../escalation/escalation.module';
import { AudioPromptsController } from './audio-prompts.controller';
import { PhysicalVisitsController } from './physical-visits.controller';
import { PhysicalVisitsService } from './physical-visits.service';
import { RemoteChecksController } from './remote-checks.controller';
import { RemoteChecksService } from './remote-checks.service';

@Module({
  imports: [ChwActivationModule, EscalationModule],
  controllers: [
    RemoteChecksController,
    PhysicalVisitsController,
    AudioPromptsController,
  ],
  providers: [RemoteChecksService, PhysicalVisitsService],
})
export class ServicesModule {}
