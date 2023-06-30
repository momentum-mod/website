import { PrismaClient } from '@prisma/client';
import { prismaWrapper } from './prisma-wrapper';

prismaWrapper(async (prisma: PrismaClient) => {
  const users = await prisma.user.findMany();
  // seed.ts adds users with random SteamIDs below 100000000000, real Steam
  // users seem always been more than that.
  const realUsers = users.filter((user) => user.steamID > 100000000000);
  if (!realUsers)
    throw 'Could not find a genuine Steam user. Have you signed in before?';

  for (const user of realUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: { roles: 8 }
    });
    console.log(`Made ${user.alias} (${user.steamID}) an admin!`);
  }
});
