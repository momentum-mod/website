import { DbUtil } from '@momentum/db';

import { prismaWrapper } from './prisma-wrapper.util';

prismaWrapper(async (prisma) => await DbUtil.nuke(prisma));
