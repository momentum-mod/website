import { deepmerge } from '@fastify/deepmerge';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from './generated/client';
import * as typedQueries from './generated/sql';

const merge = deepmerge();
export const PRISMA_CLIENT_EXTENSIONS = {
  model: {
    $allModels: {
      /**
       * Execute a `findMany`, returning the result and number of matches in a
       * [results[], count] tuple.
       *
       * Slower than a raw query using a window function, but Prisma is being
       * incredibly slow to add any native support for this.
       * https://github.com/prisma/prisma/issues/7550
       */
      findManyAndCount<Model, Args>(
        this: Model,
        args?: Prisma.Exact<Args, Prisma.Args<Model, 'findMany'>>
      ): Promise<[Prisma.Result<Model, Args, 'findMany'>, number]> {
        return Promise.all([
          (this as any).findMany(args),
          (this as any).count({ where: (args as any)?.where })
        ]);
      },
      /**
       * Return true iff an entry matching the `wbere` arg exists
       */
      async exists<Model, Args>(
        this: Model,
        args?: Prisma.Exact<
          Args,
          Pick<Prisma.Args<Model, 'findFirst'>, 'where'>
        >
      ): Promise<boolean> {
        // Uses a `findFirst` rather than `count` to avoid reading the entire
        // table.
        const found = await (this as any).findFirst(args);
        return Boolean(found);
      }
    }
  },
  query: {
    user: {
      /**
       * Create a User, ensuring profile and userStats entries are created.
       */
      async create({ args, query }: { args: any; query: any }) {
        return query(
          merge(
            { data: { profile: { create: {} }, userStats: { create: {} } } },
            args
          )
        );
      }
    }
  },
  client: { typedQueries }
};

export const prismaExtensionFactory = (client: PrismaClient) => {
  return client.$extends(PRISMA_CLIENT_EXTENSIONS);
};

export type ExtendedPrismaClient = ReturnType<typeof prismaExtensionFactory>;
export type ExtendedTransactionClient = Omit<
  ExtendedPrismaClient,
  '$extends' | '$transaction' | '$disconnect' | '$connect' | '$on' | '$use'
>;

export const getExtendedPrismaClient = () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] })
  });

  return prismaExtensionFactory(prisma);
};
