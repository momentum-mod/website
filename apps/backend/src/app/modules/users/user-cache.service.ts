import { Inject, Injectable } from '@nestjs/common';
import { User } from '@momentum/db';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { ValkeyService } from '../valkey/valkey.service';

const CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 hours

@Injectable()
export class UserCacheService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly valkey: ValkeyService
  ) {}

  /**
   * Fetches a user by ID, utilizing Valkey caching for improved performance.
   */
  async getUser(id: number): Promise<User | null> {
    const cached = await this.valkey.get(this.cacheKey(id));
    if (cached !== null) return this.deserialize(cached);

    const user = await this.db.user.findUnique({ where: { id } });
    if (user) {
      await this.valkey.set(
        this.cacheKey(id),
        this.serialize(user),
        'EX',
        CACHE_TTL_SECONDS
      );
    }

    return user;
  }

  /**
   * Fetches multiple users by their IDs, utilizing Valkey caching for improved
   * performance.
   *
   * Returned array will have same order as input IDs, with nulls for any users
   * that don't exist.
   */
  async getUsers(ids: number[]): Promise<Array<User | null>> {
    if (ids.length === 0) return [];

    const keys = ids.map((id) => this.cacheKey(id));
    const cached = await this.valkey.mget(...keys);

    const users: User[] = new Array(ids.length).fill(null);

    const missingIDs: number[] = [];

    for (const [index, id] of ids.entries()) {
      if (cached[index] !== null) {
        users[index] = this.deserialize(cached[index]);
      } else {
        missingIDs.push(id);
      }
    }

    if (missingIDs.length > 0) {
      const fetched = await this.db.user.findMany({
        where: { id: { in: missingIDs } }
      });

      const pipeline = this.valkey.pipeline();
      for (const user of fetched) {
        pipeline.set(
          this.cacheKey(user.id),
          this.serialize(user),
          'EX',
          CACHE_TTL_SECONDS
        );

        const index = ids.indexOf(user.id);
        if (index !== -1) {
          users[index] = user;
        }
      }

      await pipeline.exec();
    }

    return users;
  }

  async invalidate(id: number): Promise<void> {
    await this.valkey.del(this.cacheKey(id));
  }

  private cacheKey(userID: number): string {
    return `user:${userID}`;
  }

  private serialize(user: User): string {
    return JSON.stringify(user);
  }

  private deserialize(json: string): User {
    return JSON.parse(json, (key, value) => {
      if (key === 'steamID' && value !== null) return BigInt(value);
      if (key === 'createdAt') return new Date(value);
      return value;
    });
  }
}
