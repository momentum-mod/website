import { INestApplication } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PRISMA_CLIENT_EXTENSIONS } from '@momentum/db';
import { ITXClientDenyList } from '@prisma/client/runtime';

export const extendedNestJsPrismaClientFactory = (
  client: PrismaClient<Prisma.PrismaClientOptions, 'query'>
) => {
  return client.$extends({
    client: {
      async enableShutdownHooks(app: INestApplication) {
        Prisma.getExtensionContext(client).$on('beforeExit', async () => {
          await app.close();
        });
      }
    },
    ...PRISMA_CLIENT_EXTENSIONS
  });
};

export type ExtendedPrismaService = ReturnType<
  typeof extendedNestJsPrismaClientFactory
>;

export type ExtendedPrismaServiceTransaction = Omit<
  ExtendedPrismaService,
  ITXClientDenyList
>;
