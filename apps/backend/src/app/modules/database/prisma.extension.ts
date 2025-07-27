import { Prisma, PrismaClient } from '@momentum/db';
import { PRISMA_CLIENT_EXTENSIONS } from '@momentum/db';

export const extendedNestJsPrismaClientFactory = (
  client: PrismaClient<Prisma.PrismaClientOptions, 'query'>
) => {
  return client.$extends(PRISMA_CLIENT_EXTENSIONS);
};

export type ExtendedPrismaService = ReturnType<
  typeof extendedNestJsPrismaClientFactory
>;

// https://github.com/prisma/prisma/issues/20738
export type ExtendedPrismaServiceTransaction = Omit<
  ExtendedPrismaService,
  '$extends' | '$transaction' | '$disconnect' | '$connect' | '$on' | '$use'
>;
