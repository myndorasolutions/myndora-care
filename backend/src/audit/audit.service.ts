import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditDb = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist a mutation audit row.
   * When `tx` is provided, writes inside that transaction (failures propagate).
   * Outside a transaction, failures are logged and swallowed so clinical writes are not aborted.
   */
  async logAuditEvent(
    actorId: string,
    action: string,
    entityName: string,
    entityId: string | null,
    beforeState: unknown,
    afterState: unknown,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db: AuditDb = tx ?? this.prisma;
    const data: Prisma.AuditLogCreateInput = {
      action,
      entityName,
      entityId: entityId ?? undefined,
      ...(beforeState != null
        ? { beforeState: beforeState as Prisma.InputJsonValue }
        : {}),
      ...(afterState != null
        ? { afterState: afterState as Prisma.InputJsonValue }
        : {}),
      user: { connect: { id: actorId } },
    };

    if (tx) {
      await db.auditLog.create({ data });
      return;
    }

    try {
      await db.auditLog.create({ data });
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to write audit log action=${action} entity=${entityName}/${entityId ?? 'n/a'}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async listRecent(limit = 100) {
    const take = Math.min(Math.max(limit, 1), 500);
    const rows = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: { select: { id: true, email: true, phoneNumber: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      actorId: r.actorId,
      actorEmail: r.user.email,
      actorPhone: r.user.phoneNumber,
      action: r.action,
      entityName: r.entityName,
      entityId: r.entityId,
      beforeState: r.beforeState,
      afterState: r.afterState,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
