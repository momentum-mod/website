import { PrismaClient } from '@prisma/client';
import {
  ExtendedPrismaClient,
  getExtendedPrismaClient,
  nuke
} from '@momentum/db';
import { DbUtil } from '@momentum/test-utils';
import { arrayFrom } from '@momentum/util-fn';

// No, these are not E2E tests, but they need a live DB so they live here. Bite me!
describe('Prisma Client Extensions', () => {
  let prisma: PrismaClient;
  let ePrisma: ExtendedPrismaClient;
  let db: DbUtil;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await nuke(prisma);
    ePrisma = getExtendedPrismaClient();
    db = new DbUtil(prisma);
  });

  afterAll(() => Promise.all([prisma.$disconnect, ePrisma.$disconnect()]));

  describe('findManyAndCount', () => {
    beforeAll(async () => {
      await prisma.user.createMany({
        data: arrayFrom(10, (i) => ({ alias: 'User', roles: i >= 5 ? 1 : 0 }))
      });
    });

    afterAll(() => db.cleanup('user'));

    it('should return a tuple of items and their count', async () => {
      const res = await ePrisma.user.findManyAndCount();
      expect(Array.isArray(res[0])).toBe(true);
      expect(res[1]).toBe(10);
    });

    it('should return a valid count for filtered query', async () => {
      const res = await ePrisma.user.findManyAndCount({ where: { roles: 1 } });
      expect(Array.isArray(res[0])).toBe(true);
      expect(res[1]).toBe(5);
    });

    it('should return empty array and count = 0 when no matches', async () => {
      const res = await ePrisma.user.findManyAndCount({ where: { roles: 2 } });
      expect(res).toMatchObject([[], 0]);
    });
  });

  describe('exists', () => {
    beforeAll(() => prisma.user.create({ data: { alias: 'User', roles: 0 } }));

    afterAll(() => db.cleanup('user'));

    it('should return true if item exists', async () => {
      expect(await ePrisma.user.exists()).toBe(true);
      expect(await ePrisma.user.exists({ where: { roles: 0 } })).toBe(true);
    });

    it('should return false if item does not exist', async () => {
      expect(await ePrisma.user.exists({ where: { roles: 1 } })).toBe(false);
    });
  });

  describe('user.create', () => {
    afterAll(() => db.cleanup('user'));

    it('should always create profile and userStats entries', async () => {
      expect(await prisma.user.findFirst()).toBeNull();
      expect(await prisma.profile.findFirst()).toBeNull();
      expect(await prisma.userStats.findFirst()).toBeNull();

      const { id: userID } = await ePrisma.user.create({ data: { alias: '' } });
      const profile = await prisma.profile.findFirst();
      const userStats = await prisma.userStats.findFirst();
      expect(profile.userID).toBe(userID);
      expect(userStats).toMatchObject({
        userID: userID,
        level: 1,
        cosXP: 0n,
        mapsCompleted: 0,
        runsSubmitted: 0,
        totalJumps: 0n,
        totalStrafes: 0n
      });
    });
  });
});
