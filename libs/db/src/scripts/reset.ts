import { nuke } from '../prisma/utils';
import { prismaWrapper } from './prisma-wrapper';

prismaWrapper(async (prisma) => await nuke(prisma));
