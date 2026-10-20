import { Inject, Injectable } from '@nestjs/common';
import { User } from '@momentum/db';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { ValkeyService } from '../valkey/valkey.service';

/**
 * How long a cached user lives. Every code path that writes a User row calls
 * `invalidate`, so this is only a backstop for writes that bypass the API
 * (scripts, manual SQL) and for the small race where a read repopulates the
 * cache with a row read just before a concurrent write committed.
 */
export const USER_CACHE_TTL_SECONDS = 10 * 60;

const KEY_PREFIX = 'usercache:';

/**
 * Read-through Valkey cache of `User` rows, shared by every cluster worker.
 *
 * Use for display and existence lookups (hydrating leaderboards, checking a
 * user exists). Don't use for authorization decisions (roles/bans checks in
 * guards etc.): those must see writes made outside the API immediately.
 *
 * Anything that updates or deletes a User row MUST call `invalidate` after
 * the write has committed.
 */
@Injectable()
export class UserCacheService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly valkey: ValkeyService
  ) {}

  async getUser(id: number): Promise<User | null> {
    const cached = await this.valkey.get(UserCacheService.key(id));
    if (cached !== null) return UserCacheService.deserialize(cached);

    const user = await this.db.user.findUnique({ where: { id } });
    if (user) {
      await this.valkey.set(
        UserCacheService.key(id),
        UserCacheService.serialize(user),
        'EX',
        USER_CACHE_TTL_SECONDS
      );
    }

    return user;
  }

  /**
   * Fetch several users. The result has the same length and order as `ids`,
   * with `null` for users that don't exist. Duplicate IDs are fine.
   */
  async getUsers(ids: number[]): Promise<Array<User | null>> {
    if (ids.length === 0) return [];

    const uniqueIDs = [...new Set(ids)];
    const cached = await this.valkey.mget(
      ...uniqueIDs.map(UserCacheService.key)
    );

    const found = new Map<number, User>();
    const missing: number[] = [];
    for (const [i, id] of uniqueIDs.entries()) {
      if (cached[i] === null) missing.push(id);
      else found.set(id, UserCacheService.deserialize(cached[i]));
    }

    if (missing.length > 0) {
      const fetched = await this.db.user.findMany({
        where: { id: { in: missing } }
      });

      if (fetched.length > 0) {
        const pipeline = this.valkey.pipeline();
        for (const user of fetched) {
          found.set(user.id, user);
          pipeline.set(
            UserCacheService.key(user.id),
            UserCacheService.serialize(user),
            'EX',
            USER_CACHE_TTL_SECONDS
          );
        }
        await pipeline.exec();
      }
    }

    return ids.map((id) => found.get(id) ?? null);
  }

  async exists(id: number): Promise<boolean> {
    return (await this.getUser(id)) !== null;
  }

  /** Drop cached users. Call after any write to their User rows commits. */
  async invalidate(...ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.valkey.del(...ids.map(UserCacheService.key));
  }

  private static key(id: number): string {
    return KEY_PREFIX + id;
  }

  private static serialize(user: User): string {
    return JSON.stringify(user, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
  }

  private static deserialize(json: string): User {
    const user = JSON.parse(json);
    if (user.steamID != null) user.steamID = BigInt(user.steamID);
    user.createdAt = new Date(user.createdAt);
    return user;
  }
}
