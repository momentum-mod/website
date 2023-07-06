import { PrismaClient } from '@prisma/client';
import {
  ExtendedPrismaClient,
  getExtendedPrismaClient,
  nuke
} from '@momentum/db';
import { DbUtil } from '@momentum/backend/test-utils';

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
        data: Array.from({ length: 10 }, (_, i) => ({
          alias: 'User',
          roles: i >= 5 ? 1 : 0
        }))
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
});
