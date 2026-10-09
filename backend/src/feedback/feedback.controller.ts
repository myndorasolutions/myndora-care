import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Public()
  @Post()
  create(
    @Body() dto: CreateFeedbackDto,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.feedbackService.create(dto, req.user);
  }
}
