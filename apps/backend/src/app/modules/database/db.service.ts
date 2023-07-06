import { INestApplication, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { ExtendPrismaClient } from '@momentum/db';

const prisma = new PrismaClient();

// https://github.com/prisma/prisma/issues/18628#issuecomment-1601958220
const ExtendedPrismaClientProxy = () =>
  new Proxy(class {}, {
    construct(target, args, newTarget) {
      return Object.assign(
        Reflect.construct(target, args, newTarget),
        ExtendPrismaClient(prisma)
      );
    }
  }) as new () => ReturnType<typeof ExtendPrismaClient>;

@Injectable()
export class DbService extends ExtendedPrismaClientProxy() {
  async enableShutdownHooks(app: INestApplication) {
    Prisma.getExtensionContext(prisma).$on('beforeExit', async () => {
      await app.close();
    });
  }
}
