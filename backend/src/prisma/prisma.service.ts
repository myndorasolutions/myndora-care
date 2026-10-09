import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
    // Non-blocking warm-up: do not prevent app.listen() / Cloud Run port binding.
    void this.$connect().catch((error: unknown) => {
      this.logger.warn(
        `Deferred Prisma connect failed (API liveness unaffected): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
