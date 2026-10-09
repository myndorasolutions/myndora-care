import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('audio-prompts')
export class AudioPromptsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(UserRole.CHW, UserRole.ADMIN)
  list(@Query('language') language?: string) {
    const normalized = language?.trim();
    const languageFilter =
      !normalized || normalized.toLowerCase() === 'all'
        ? undefined
        : normalized.toLowerCase() === 'en' ||
            normalized.toLowerCase() === 'english'
          ? 'English'
          : normalized.toLowerCase() === 'yo' ||
              normalized.toLowerCase() === 'yoruba'
            ? 'Yoruba'
            : normalized;

    return this.prisma.audioPrompt.findMany({
      where: {
        isApproved: true,
        ...(languageFilter ? { language: languageFilter } : {}),
      },
      orderBy: [{ promptKey: 'asc' }, { language: 'asc' }],
      select: {
        id: true,
        promptKey: true,
        language: true,
        transcriptText: true,
        audioUrl: true,
        isApproved: true,
      },
    });
  }
}
