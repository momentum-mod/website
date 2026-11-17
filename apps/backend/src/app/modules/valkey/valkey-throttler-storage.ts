/**
 * Adapted from @nestjs-redis/throttler-storage v2.0.1
 *   https://www.npmjs.com/package/@nestjs-redis/throttler-storage
 *   https://github.com/CSenshi/nestjs-redis/tree/main/packages/throttler-storage
 *
 * Changes from upstream:
 * - Calls iovalkey directly rather than node-redis.
 * - Only includes the SlidingWindowCounter algorithm, inlined in this file.
 *
 * Upstream's tests live in that repo and haven't been ported here. If we make
 * further changes to this file ourselves, we should port their tests AND
 * write our own covering whatever we changed.
 *
 * Original license:
 *
 * MIT License
 *
 * Copyright (c) 2025 Saba Pochkhua
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import type Valkey from 'iovalkey';

/**
 * Valkey-backed storage for @nestjs/throttler, so limits are shared across
 * every backend process instead of being tracked per-process in memory.
 */
export class ValkeyThrottlerStorage implements ThrottlerStorage {
  private scriptSha?: string;
  private readonly prefix = '_throttler';

  /**
   * The client lifecycle is NOT managed by this storage instance.
   */
  constructor(private readonly client: Valkey) {}

  /**
   * Loads the Lua script into Valkey and caches its SHA1 hash.
   * This method is called lazily on first use or when the script is not found.
   */
  private async loadScript(): Promise<string> {
    if (this.scriptSha) {
      return this.scriptSha;
    }
    return (this.scriptSha = (await this.client.script(
      'LOAD',
      SLIDING_WINDOW_COUNTER_SCRIPT
    )) as string);
  }

  /**
   * Executes the Lua script using evalsha (or eval, if given the script
   * itself) and converts the result to a ThrottlerStorageRecord.
   */
  private async executeScript(
    scriptOrSha: string,
    keys: string[],
    args: string[]
  ): Promise<ThrottlerStorageRecord> {
    const [totalHits, timeToExpireMs, timeToBlockExpireMs, isBlocked] =
      (await (this.isSha1Hash(scriptOrSha)
        ? this.client.evalsha(scriptOrSha, keys.length, ...keys, ...args)
        : this.client.eval(scriptOrSha, keys.length, ...keys, ...args))) as [
        number,
        number,
        number,
        number
      ];

    return {
      totalHits,
      timeToExpire: timeToExpireMs > 0 ? Math.ceil(timeToExpireMs / 1000) : -1,
      isBlocked: isBlocked === 1,
      timeToBlockExpire:
        timeToBlockExpireMs > 0 ? Math.ceil(timeToBlockExpireMs / 1000) : -1
    };
  }

  /**
   * This logic is modeled after the official NestJS in-memory storage
   * implementation:
   * https://github.com/nestjs/throttler/blob/27bf8212/src/throttler.service.ts#L74
   *
   * It has been adapted for Redis with full atomicity using Lua scripting.
   */
  async increment(
    key: string,
    ttlMs: number,
    limit: number,
    blockDurationMs: number,
    throttlerName: string
  ): Promise<ThrottlerStorageRecord> {
    const keys = [`${this.prefix}:{${key}}:${throttlerName}`];
    const args = [
      ttlMs.toString(),
      limit.toString(),
      blockDurationMs.toString()
    ];

    const scriptSha = await this.loadScript();

    try {
      return await this.executeScript(scriptSha, keys, args);
    } catch (error) {
      // Handle NOSCRIPT error - script was flushed from Valkey
      if (error?.message.includes('NOSCRIPT')) {
        this.scriptSha = undefined;
        return await this.executeScript(
          SLIDING_WINDOW_COUNTER_SCRIPT,
          keys,
          args
        );
      }
      // Re-throw if it's not a NOSCRIPT error
      throw error;
    }
  }

  private isSha1Hash(value: string): boolean {
    return /^[a-f0-9]{40}$/i.test(value);
  }
}

/**
 * Sliding Window Counter rate limiter.
 *
 * Keeps two fixed-window counters (current and previous) and computes
 * a weighted count based on how far into the current window we are.
 * Atomically reads both counters, evaluates the weighted estimate,
 * and conditionally increments — preventing concurrent requests from
 * slipping past the limit.
 *
 * Both window keys are derived from KEYS[1] (base key) so they share
 * the same hash tag and map to the same slot in Redis Cluster.
 *
 * Receives KEYS[1] (the rate-limit key) and ARGV[1..3] (ttlMs, limit,
 * blockDurationMs), and returns
 * [totalHits, timeToExpireMs, timeToBlockExpireMs, isBlocked].
 *
 * Redis commands: TIME, GET, INCR, PEXPIRE, PTTL
 *
 * @see https://github.com/redis-developer/redis-ratelimiting-js/blob/main/server/components/rate-limiting/sliding-window-counter.ts
 */
const SLIDING_WINDOW_COUNTER_SCRIPT = `
    local key = KEYS[1]
    local block_key = key .. ':block'
    local ttl_ms = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local block_duration_ms = tonumber(ARGV[3])

    if redis.call('EXISTS', block_key) == 1 then
      return { limit + 1, -1, redis.call('PTTL', block_key), 1 }
    end

    local time = redis.call('TIME')
    local now_ms = time[1] * 1000 + math.floor(time[2] / 1000)

    local current_window = math.floor(now_ms / ttl_ms)
    local previous_window = current_window - 1
    local elapsed = (now_ms % ttl_ms) / ttl_ms

    local current_key = key .. ':' .. current_window
    local previous_key = key .. ':' .. previous_window

    local prev_count = tonumber(redis.call('GET', previous_key) or '0') or 0
    local current_count = tonumber(redis.call('GET', current_key) or '0') or 0

    local weighted_prev = prev_count * (1 - elapsed)
    local estimated = weighted_prev + current_count

    if estimated >= limit then
      local retry_ms = math.ceil(ttl_ms * (1 - elapsed))
      if block_duration_ms > 0 then
        redis.call('SET', block_key, '1', 'PX', block_duration_ms)
        return { limit + 1, retry_ms, block_duration_ms, 1 }
      end
      return { limit + 1, retry_ms, -1, 0 }
    end

    local new_count = redis.call('INCR', current_key)

    if new_count == 1 then
      redis.call('PEXPIRE', current_key, ttl_ms * 2)
    end

    return { new_count, redis.call('PTTL', current_key), -1, 0 }
  `;
