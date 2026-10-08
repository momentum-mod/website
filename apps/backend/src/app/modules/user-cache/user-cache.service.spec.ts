import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';
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

  const pipelineMock = { set: jest.fn(), exec: jest.fn() };
  const valkeyMock = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    mget: jest.fn(),
    pipeline: jest.fn(() => pipelineMock)
  };

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
    jest.clearAllMocks();
    pipelineMock.exec.mockResolvedValue([]);

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

  describe('getUser', () => {
    it('returns a cached user without hitting the DB, restoring bigint and Date', async () => {
      const user = makeUser(1);
      valkeyMock.get.mockResolvedValueOnce(serialize(user));

      const result = await service.getUser(1);

      expect(valkeyMock.get).toHaveBeenCalledWith('usercache:1');
      expect(db.user.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(user);
      expect(typeof result.steamID).toBe('bigint');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('keeps a null steamID (deleted/placeholder users) as null', async () => {
      const user = makeUser(1, { steamID: null });
      valkeyMock.get.mockResolvedValueOnce(serialize(user));

      expect((await service.getUser(1)).steamID).toBeNull();
    });

    it('reads through to the DB on a miss and caches with a TTL', async () => {
      const user = makeUser(2);
      valkeyMock.get.mockResolvedValueOnce(null);
      db.user.findUnique.mockResolvedValueOnce(user as any);

      expect(await service.getUser(2)).toEqual(user);
      expect(valkeyMock.set).toHaveBeenCalledWith(
        'usercache:2',
        serialize(user),
        'EX',
        USER_CACHE_TTL_SECONDS
      );
    });

    it("returns null and caches nothing for a user that doesn't exist", async () => {
      valkeyMock.get.mockResolvedValueOnce(null);
      db.user.findUnique.mockResolvedValueOnce(null);

      expect(await service.getUser(99)).toBeNull();
      expect(valkeyMock.set).not.toHaveBeenCalled();
    });
  });

  describe('getUsers', () => {
    it('returns [] for no IDs without touching Valkey', async () => {
      expect(await service.getUsers([])).toEqual([]);
      expect(valkeyMock.mget).not.toHaveBeenCalled();
    });

    it('mixes cached and fetched users, preserving input order', async () => {
      const [u1, u2, u3] = [makeUser(1), makeUser(2), makeUser(3)];
      valkeyMock.mget.mockResolvedValueOnce([
        serialize(u1),
        null,
        serialize(u3)
      ]);
      db.user.findMany.mockResolvedValueOnce([u2] as any);

      expect(await service.getUsers([1, 2, 3])).toEqual([u1, u2, u3]);
      expect(db.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: [2] } }
      });
      expect(pipelineMock.set).toHaveBeenCalledTimes(1);
    });

    it('preserves input order when the DB returns rows out of order', async () => {
      const [u1, u2] = [makeUser(1), makeUser(2)];
      valkeyMock.mget.mockResolvedValueOnce([null, null]);
      db.user.findMany.mockResolvedValueOnce([u2, u1] as any);

      expect(await service.getUsers([1, 2])).toEqual([u1, u2]);
    });

    it('returns null for missing users and handles duplicate IDs', async () => {
      const u1 = makeUser(1);
      valkeyMock.mget.mockResolvedValueOnce([null, null]);
      db.user.findMany.mockResolvedValueOnce([u1] as any);

      expect(await service.getUsers([1, 99, 1])).toEqual([u1, null, u1]);
      // Each ID only looked up once.
      expect(valkeyMock.mget).toHaveBeenCalledWith(
        'usercache:1',
        'usercache:99'
      );
    });
  });

  describe('invalidate', () => {
    it('deletes the keys for every given user', async () => {
      await service.invalidate(5, 6);
      expect(valkeyMock.del).toHaveBeenCalledWith('usercache:5', 'usercache:6');
    });

    it('does nothing for no IDs', async () => {
      await service.invalidate();
      expect(valkeyMock.del).not.toHaveBeenCalled();
    });
  });
});
