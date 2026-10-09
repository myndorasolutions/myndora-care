import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  listRecent(@Query('limit') limit?: string) {
    const parsed = limit ? Number(limit) : undefined;
    return this.auditService.listRecent(
      Number.isFinite(parsed) ? parsed : undefined,
    );
  }
}
