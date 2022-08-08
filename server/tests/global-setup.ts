import { PrismaClient, PrismaPromise } from '@prisma/client';
import { config } from 'dotenv';

export default async () => {
    // Load in environment variables
    config({ path: '../.env' });

    // Nuke the current DB (Bye)
    const prisma = new PrismaClient();

    // TODO: This is MySQL-specifc, change when porting to Postgres
    // https://www.prisma.io/docs/concepts/components/prisma-client/crud#delete-all-records-from-all-tables
    const transactions: PrismaPromise<any>[] = [];
    transactions.push(prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0;`);

    const tablenames = await prisma.$queryRaw<
        Array<{ TABLE_NAME: string }>
    >`SELECT TABLE_NAME from information_schema.TABLES WHERE TABLE_SCHEMA = 'momentum';`;

    for (const { TABLE_NAME } of tablenames) {
        if (TABLE_NAME !== '_prisma_migrations') {
            try {
                transactions.push(prisma.$executeRawUnsafe(`TRUNCATE ${TABLE_NAME};`));
            } catch (error) {
                console.log({ error });
            }
        }
    }

    transactions.push(prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1;`);

    try {
        await prisma.$transaction(transactions);
    } catch (error) {
        console.log({ error });
    }
};
