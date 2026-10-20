import { after, before, describe, it } from 'node:test';

import * as assert from 'node:assert/strict';
import { PrismaClient } from '@momentum/db';
import { PrismaPg } from '@prisma/adapter-pg';
import { ExtendedPrismaClient, getExtendedPrismaClient } from '@momentum/db';
import { DbUtil } from '@momentum/test-utils';

import { arrayFrom } from '@momentum/util-fn';

// No, these are not E2E tests, but they need a live DB so they live here. Bite me!
describe('Prisma Client Extensions', () => {
  let prisma: PrismaClient;
  let ePrisma: ExtendedPrismaClient;
  let db: DbUtil;

  before(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
    });
    db = new DbUtil(prisma);
    await db.nuke();
    ePrisma = getExtendedPrismaClient();
  });

  after(async () => {
    await Promise.all([prisma.$disconnect, ePrisma.$disconnect()]);
  });

  describe('findManyAndCount', () => {
    before(async () => {
      await prisma.user.createMany({
        data: arrayFrom(10, (i) => ({ alias: 'User', roles: i >= 5 ? 1 : 0 }))
      });
    });

    after(async () => {
      await db.cleanup('user');
    });

    it('should return a tuple of items and their count', async () => {
      const res = await ePrisma.user.findManyAndCount();
      assert.equal(Array.isArray(res[0]), true);
      assert.equal(res[1], 10);
    });

    it('should return a valid count for filtered query', async () => {
      const res = await ePrisma.user.findManyAndCount({ where: { roles: 1 } });
      assert.equal(Array.isArray(res[0]), true);
      assert.equal(res[1], 5);
    });

    it('should return empty array and count = 0 when no matches', async () => {
      const res = await ePrisma.user.findManyAndCount({ where: { roles: 2 } });
      assert.partialDeepStrictEqual(res, [[], 0]);
    });
  });

  describe('exists', () => {
    before(async () => {
      await prisma.user.create({ data: { alias: 'User', roles: 0 } });
    });

    after(async () => {
      await db.cleanup('user');
    });

    it('should return true if item exists', async () => {
      assert.equal(await ePrisma.user.exists(), true);
      assert.equal(await ePrisma.user.exists({ where: { roles: 0 } }), true);
    });

    it('should return false if item does not exist', async () => {
      assert.equal(await ePrisma.user.exists({ where: { roles: 1 } }), false);
    });
  });

  describe('user.create', () => {
    after(async () => {
      await db.cleanup('user');
    });

    it('should always create profile and userStats entries', async () => {
      assert.equal(await prisma.user.findFirst(), null);
      assert.equal(await prisma.profile.findFirst(), null);
      assert.equal(await prisma.userStats.findFirst(), null);

      const { id: userID } = await ePrisma.user.create({ data: { alias: '' } });
      const profile = await prisma.profile.findFirst();
      const userStats = await prisma.userStats.findFirst();
      assert.equal(profile.userID, userID);
      assert.partialDeepStrictEqual(userStats, {
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
