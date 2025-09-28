import { PrismaClient } from '@momentum/db';
import { prismaWrapper } from './prisma-wrapper.util';

/* eslint-disable */

// Empty script setup for local testing
// Usage: nx run scripts:scratchpad
prismaWrapper(
  async (prisma: PrismaClient) => {
    // do stuff here
  },
  { log: ['query'] }
);
