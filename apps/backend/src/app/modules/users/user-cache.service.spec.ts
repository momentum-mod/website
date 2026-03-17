import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';
import { User } from '@momentum/db';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import {
  PRISMA_MOCK_PROVIDER,
  PrismaMock
} from '../../../../test/prisma-mock.const';
import { UserCacheService } from './user-cache.service';
import { ValkeyService } from '../valkey/valkey.service';

const CACHE_TTL_SECONDS = 6 * 60 * 60;

describe('UserCacheService', () => {
  let service: UserCacheService;
  let db: PrismaMock;

  const pipelineMock = {
    set: jest.fn(),
    exec: jest.fn().mockResolvedValue([])
  };

  const valkeyMock = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    mget: jest.fn(),
    pipeline: jest.fn(() => pipelineMock)
  };

  const makeUser = (id: number): User =>
    ({
      id,
      steamID: BigInt('7656119800000000') + BigInt(id),
      alias: `User ${id}`,
      avatar: 'abc123',
      country: 'US',
      roles: 0,
      bans: 0,
      createdAt: new Date('2024-01-01T00:00:00.000Z')
    }) as unknown as User;

  const serialize = (user: User): string => JSON.stringify(user);

  beforeEach(async () => {
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

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUser', () => {
    it('should return a deserialized user on a cache hit, without hitting the DB', async () => {
      const user = makeUser(1);
      valkeyMock.get.mockResolvedValueOnce(serialize(user));

      const result = await service.getUser(1);

      expect(valkeyMock.get).toHaveBeenCalledWith('user:1');
      expect(db.user.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual(user);
    });

    it('should deserialize steamID as a bigint from the cache', async () => {
      const user = makeUser(1);
      valkeyMock.get.mockResolvedValueOnce(serialize(user));

      const result = await service.getUser(1);

      expect(typeof result.steamID).toBe('bigint');
      expect(result.steamID).toBe(user.steamID);
    });

    it('should deserialize createdAt as a Date from the cache', async () => {
      const user = makeUser(1);
      valkeyMock.get.mockResolvedValueOnce(serialize(user));

      const result = await service.getUser(1);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt).toEqual(user.createdAt);
    });

    it('should fetch from the DB on a cache miss, write to cache, and return the user', async () => {
      const user = makeUser(2);
      valkeyMock.get.mockResolvedValueOnce(null);
      db.user.findUnique.mockResolvedValueOnce(user as any);

      const result = await service.getUser(2);

      expect(db.user.findUnique).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(valkeyMock.set).toHaveBeenCalledWith(
        'user:2',
        serialize(user),
        'EX',
        CACHE_TTL_SECONDS
      );
      expect(result).toEqual(user);
    });

    it('should return null and not write to cache if the user does not exist in the DB', async () => {
      valkeyMock.get.mockResolvedValueOnce(null);
      db.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.getUser(99);

      expect(result).toBeNull();
      expect(valkeyMock.set).not.toHaveBeenCalled();
    });
  });

  describe('getUsers', () => {
    it('should return an empty array immediately for an empty input without hitting Valkey', async () => {
      const result = await service.getUsers([]);

      expect(result).toEqual([]);
      expect(valkeyMock.mget).not.toHaveBeenCalled();
    });

    it('should return all users from cache when all are cached', async () => {
      const users = [makeUser(1), makeUser(2)];
      valkeyMock.mget.mockResolvedValueOnce(users.map(serialize));

      const result = await service.getUsers([1, 2]);

      expect(valkeyMock.mget).toHaveBeenCalledWith('user:1', 'user:2');
      expect(db.user.findMany).not.toHaveBeenCalled();
      expect(valkeyMock.pipeline).not.toHaveBeenCalled();
      expect(result).toEqual(users);
    });

    it('should fetch all from DB and cache via pipeline when none are cached', async () => {
      const user1 = makeUser(1);
      const user2 = makeUser(2);
      valkeyMock.mget.mockResolvedValueOnce([null, null]);
      db.user.findMany.mockResolvedValueOnce([user1, user2] as any);

      const result = await service.getUsers([1, 2]);

      expect(db.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } }
      });
      expect(valkeyMock.pipeline).toHaveBeenCalled();
      expect(pipelineMock.set).toHaveBeenCalledTimes(2);
      expect(pipelineMock.set).toHaveBeenCalledWith(
        'user:1',
        serialize(user1),
        'EX',
        CACHE_TTL_SECONDS
      );
      expect(pipelineMock.set).toHaveBeenCalledWith(
        'user:2',
        serialize(user2),
        'EX',
        CACHE_TTL_SECONDS
      );
      expect(pipelineMock.exec).toHaveBeenCalled();
      expect(result).toEqual([user1, user2]);
    });

    it('should handle a mix of cached and uncached users correctly', async () => {
      const user1 = makeUser(1);
      const user2 = makeUser(2);
      const user3 = makeUser(3);
      valkeyMock.mget.mockResolvedValueOnce([
        serialize(user1),
        null,
        serialize(user3)
      ]);
      db.user.findMany.mockResolvedValueOnce([user2] as any);

      const result = await service.getUsers([1, 2, 3]);

      expect(db.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: [2] } }
      });
      expect(pipelineMock.set).toHaveBeenCalledTimes(1);
      expect(pipelineMock.set).toHaveBeenCalledWith(
        'user:2',
        serialize(user2),
        'EX',
        CACHE_TTL_SECONDS
      );
      expect(result).toEqual([user1, user2, user3]);
    });

    it('should return results in input ID order even when DB returns users in a different order', async () => {
      const user1 = makeUser(1);
      const user2 = makeUser(2);
      const user3 = makeUser(3);
      valkeyMock.mget.mockResolvedValueOnce([null, null, null]);
      db.user.findMany.mockResolvedValueOnce([user3, user1, user2] as any);

      const result = await service.getUsers([1, 2, 3]);

      expect(result[0]).toEqual(user1);
      expect(result[1]).toEqual(user2);
      expect(result[2]).toEqual(user3);
    });

    it('should return null at the correct index for IDs that do not exist in the DB', async () => {
      const user1 = makeUser(1);
      valkeyMock.mget.mockResolvedValueOnce([null, null]);
      db.user.findMany.mockResolvedValueOnce([user1] as any);

      const result = await service.getUsers([1, 99]);

      expect(result[0]).toEqual(user1);
      expect(result[1]).toBeNull();
    });

    it('should not call the pipeline when no users are missing from the cache', async () => {
      const user = makeUser(10);
      valkeyMock.mget.mockResolvedValueOnce([serialize(user)]);

      await service.getUsers([10]);

      expect(db.user.findMany).not.toHaveBeenCalled();
      expect(valkeyMock.pipeline).not.toHaveBeenCalled();
    });
  });

  describe('invalidate', () => {
    it('should delete the correct Valkey key for the given user ID', async () => {
      await service.invalidate(5);

      expect(valkeyMock.del).toHaveBeenCalledWith('user:5');
    });
  });
});
