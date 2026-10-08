import * as assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  mockDeep,
  resetDeepMockCalls,
  wasCalledWith
} from '@momentum/test-utils';
import { User } from '@momentum/db';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import {
  PRISMA_MOCK_PROVIDER,
  PrismaMock
} from '../../../../test/prisma-mock.const';
import { ValkeyService } from '../valkey/valkey.service';
import { USER_CACHE_TTL_SECONDS, UserCacheService } from './user-cache.service';

describe('UserCacheService', () => {
  let service: UserCacheService;
  let db: PrismaMock;
  let valkeyMock;
  let pipelineMock;

  const makeUser = (id: number, overrides: Partial<User> = {}): User => ({
    id,
    steamID: 76561198000000000n + BigInt(id),
    alias: `User ${id}`,
    avatar: 'abc123',
    country: 'GB',
    roles: 0,
    bans: 0,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides
  });

  const serialize = (user: User) =>
    JSON.stringify({ ...user, steamID: user.steamID?.toString() ?? null });

  beforeEach(async () => {
    pipelineMock = {
      set: mock.fn(),
      exec: mock.fn(async () => [])
    };
    valkeyMock = {
      get: mock.fn(),
      set: mock.fn(),
      del: mock.fn(),
      mget: mock.fn(),
      pipeline: mock.fn(() => pipelineMock)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCacheService,
        PRISMA_MOCK_PROVIDER,
        { provide: ValkeyService, useValue: valkeyMock }
      ]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get(UserCacheService);
    db = module.get(EXTENDED_PRISMA_SERVICE);
  });

  afterEach(() => {
    resetDeepMockCalls();
  });

  describe('getUser', () => {
    it('should return a cached user without hitting the DB, restoring bigint and Date', async () => {
      const user = makeUser(1);
      valkeyMock.get.mock.mockImplementationOnce(async () => serialize(user));

      const result = await service.getUser(1);

      assert.ok(wasCalledWith(valkeyMock.get, 'usercache:1'));
      assert.equal(db.user.findUnique.mock.callCount(), 0);
      assert.deepEqual(result, user);
      assert.equal(typeof result.steamID, 'bigint');
      assert.ok(result.createdAt instanceof Date);
    });

    it('should keep a null steamID (deleted/placeholder users) as null', async () => {
      const user = makeUser(1, { steamID: null });
      valkeyMock.get.mock.mockImplementationOnce(async () => serialize(user));

      assert.equal((await service.getUser(1)).steamID, null);
    });

    it('should read through to the DB on a miss and cache with a TTL', async () => {
      const user = makeUser(2);
      valkeyMock.get.mock.mockImplementationOnce(async () => null);
      db.user.findUnique.mock.mockImplementationOnce(async () => user);

      assert.deepEqual(await service.getUser(2), user);
      assert.ok(
        wasCalledWith(
          valkeyMock.set,
          'usercache:2',
          serialize(user),
          'EX',
          USER_CACHE_TTL_SECONDS
        )
      );
    });

    it("should return null and cache nothing for a user that doesn't exist", async () => {
      valkeyMock.get.mock.mockImplementationOnce(async () => null);
      db.user.findUnique.mock.mockImplementationOnce(async () => null);

      assert.equal(await service.getUser(99), null);
      assert.equal(valkeyMock.set.mock.callCount(), 0);
    });
  });

  describe('getUsers', () => {
    it('should return [] for no IDs without touching Valkey', async () => {
      assert.deepEqual(await service.getUsers([]), []);
      assert.equal(valkeyMock.mget.mock.callCount(), 0);
    });

    it('should mix cached and fetched users, preserving input order', async () => {
      const [u1, u2, u3] = [makeUser(1), makeUser(2), makeUser(3)];
      valkeyMock.mget.mock.mockImplementationOnce(async () => [
        serialize(u1),
        null,
        serialize(u3)
      ]);
      db.user.findMany.mock.mockImplementationOnce(async () => [u2]);

      assert.deepEqual(await service.getUsers([1, 2, 3]), [u1, u2, u3]);
      assert.ok(
        wasCalledWith(db.user.findMany, { where: { id: { in: [2] } } })
      );
      assert.equal(pipelineMock.set.mock.callCount(), 1);
    });

    it('should preserve input order when the DB returns rows out of order', async () => {
      const [u1, u2] = [makeUser(1), makeUser(2)];
      valkeyMock.mget.mock.mockImplementationOnce(async () => [null, null]);
      db.user.findMany.mock.mockImplementationOnce(async () => [u2, u1]);

      assert.deepEqual(await service.getUsers([1, 2]), [u1, u2]);
    });

    it('should return null for missing users and handle duplicate IDs', async () => {
      const u1 = makeUser(1);
      valkeyMock.mget.mock.mockImplementationOnce(async () => [null, null]);
      db.user.findMany.mock.mockImplementationOnce(async () => [u1]);

      assert.deepEqual(await service.getUsers([1, 99, 1]), [u1, null, u1]);
      // Each ID only looked up once.
      assert.ok(wasCalledWith(valkeyMock.mget, 'usercache:1', 'usercache:99'));
    });
  });

  describe('invalidate', () => {
    it('should delete the keys for every given user', async () => {
      await service.invalidate(5, 6);
      assert.ok(wasCalledWith(valkeyMock.del, 'usercache:5', 'usercache:6'));
    });

    it('should do nothing for no IDs', async () => {
      await service.invalidate();
      assert.equal(valkeyMock.del.mock.callCount(), 0);
    });
  });
});
