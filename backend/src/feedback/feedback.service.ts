import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

const MAX_SCREENSHOT = 400_000;

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFeedbackDto, actor?: AuthUser) {
    if (dto.screenshotBase64 && dto.screenshotBase64.length > MAX_SCREENSHOT) {
      throw new BadRequestException('Screenshot exceeds size limit');
    }

    const report = await this.prisma.feedbackReport.create({
      data: {
        title: dto.title.trim(),
        description: dto.description.trim(),
        severity: dto.severity ?? 'medium',
        pageUrl: dto.pageUrl,
        userAgent: dto.userAgent,
        role: dto.role ?? actor?.role,
        userId: actor?.userId,
        screenshotBase64: dto.screenshotBase64,
      },
    });

    return {
      id: report.id,
      createdAt: report.createdAt,
      status: 'received',
    };
  }
}
