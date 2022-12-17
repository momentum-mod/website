import 'tsconfig-paths/register'; // This MUST be imported for absolute modules to be recognised!
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { nuke } from '@db/nuke';

export default async () => {
    // Load in environment variables
    config({ path: '../.env' });

    const prisma = new PrismaClient();

    // Nuke the current DB (Bye)
    await nuke(prisma);

    await prisma.$disconnect();
};
