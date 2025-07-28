import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@momentum/db';

@Injectable()
export class DbService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  // Prisma supposedly has some some magic built-in support for this, don't
  // understand exactly how it works, and doesn't seem to work with our client
  // extension setup in E2E tests. Easier to just do ourselves like this.
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
