import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { nuke } from '@prisma/nuke';

export default async () => {
    // Load in environment variables
    config({ path: '../.env' });

    // Nuke the current DB (Bye)
    await nuke(new PrismaClient());
};
