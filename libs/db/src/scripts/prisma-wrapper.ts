import { PrismaClient } from '@prisma/client';

export const prismaWrapper = (fn: (prisma: PrismaClient) => Promise<void>) => {
  const prisma = new PrismaClient();

  const env = process.env.NODE_ENV;
  if (!(env === 'dev' || env === 'test')) {
    console.error(
      'Refusing to run DB-altering script unless NODE_ENV is set to "dev" or "test".'
    );
    prisma.$disconnect().then((_) => process.abort());
  } else {
    let exitCode = 0;
    fn(prisma)
      .catch((error) => {
        console.error(error);
        exitCode = 1;
      })
      .finally(async () => {
        await prisma.$disconnect();
        // This is a wrapper around CLI apps
        // eslint-disable-next-line unicorn/no-process-exit
        process.exit(exitCode);
      });
  }
};
