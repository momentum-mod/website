import { nuke } from '@momentum/db';

import { prismaWrapper } from './prisma-wrapper.util';

prismaWrapper(async (prisma) => await nuke(prisma));
