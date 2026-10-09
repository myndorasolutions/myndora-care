import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UpdateEscalationReviewDto } from './dto/update-escalation-review.dto';
import { EscalationService } from './escalation.service';

@Controller('escalations')
export class EscalationController {
  constructor(private readonly escalationService: EscalationService) {}

  @Get('review-queue')
  @Roles(UserRole.ADMIN, UserRole.CLINICIAN_REVIEWER)
  getReviewQueue() {
    return this.escalationService.getReviewQueue();
  }

  @Patch(':id/review')
  @Roles(UserRole.ADMIN, UserRole.CLINICIAN_REVIEWER)
  async updateReview(
    @Param('id') id: string,
    @Body() dto: UpdateEscalationReviewDto,
    @CurrentUser() user: AuthUser,
  ) {
    const updated = await this.escalationService.updateReview(
      id,
      dto,
      user.userId,
    );
    if (!updated) {
      throw new NotFoundException(`Escalation case ${id} not found`);
    }
    return updated;
  }
}
