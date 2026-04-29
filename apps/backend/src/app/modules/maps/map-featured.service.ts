import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import {
  DisabledGamemodes,
  Gamemode,
  LeaderboardType,
  MapStatus,
  TrackType
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { ValkeyService } from '../valkey/valkey.service';
import { DtoFactory, FeaturedMapsForGamemodeDto } from '../../dto';
import { isFirstWorker } from '../../../clustered';

/** A min/max tier range (inclusive). */
export type TierRange = readonly [min: number, max: number];

/** The three featured slots for a gamemode, from easiest to hardest. */
export type FeaturedTierSlots = readonly [TierRange, TierRange, TierRange];

/**
 * Default tier ranges used for all gamemodes unless overridden below.
 *  - Slot 1 (beginner):     tier 1–2
 *  - Slot 2 (intermediate): tier 2–3
 *  - Slot 3 (advanced):     tier 4–6
 */
export const DEFAULT_FEATURED_TIERS: FeaturedTierSlots = [
  [1, 2],
  [2, 3],
  [4, 6]
] as const;

/**
 * Per-gamemode tier range overrides.
 * Any gamemode not listed here falls back to DEFAULT_FEATURED_TIERS.
 */
export const GAMEMODE_FEATURED_TIER_OVERRIDES = new Map<
  Gamemode,
  FeaturedTierSlots
>([
  // Example:
  // [Gamemode.SURF, [[1, 2], [3, 4], [5, 6]]],
]);

const FEATURED_MAPS_JOB_NAME = 'FeaturedMapsRefreshJob';
const FEATURED_MAPS_CRON = '0 * * * *'; // top of every hour

@Injectable()
export class MapFeaturedService implements OnModuleInit {
  private readonly logger = new Logger(MapFeaturedService.name);

  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly valkey: ValkeyService,
    private readonly schedulerRegistry: SchedulerRegistry
  ) {}

  async onModuleInit(): Promise<void> {
    // Only the primary worker manages the cache and schedule.
    if (!isFirstWorker()) return;

    const gamemodes = this.getActiveGamemodes();
    const cached = await this.valkey.mget(
      ...gamemodes.map((gm) => this.valkeyKey(gm))
    );
    if (cached.includes(null)) {
      await this.refreshFeaturedMaps();
    }

    this.schedulerRegistry.addCronJob(
      FEATURED_MAPS_JOB_NAME,
      CronJob.from({
        cronTime: FEATURED_MAPS_CRON,
        onTick: this.refreshFeaturedMaps.bind(this),
        waitForCompletion: true,
        start: true
      })
    );
  }

  async getFeaturedMaps(): Promise<FeaturedMapsForGamemodeDto[]> {
    const gamemodes = this.getActiveGamemodes();

    // Fetch cached IDs for all gamemodes in a single round-trip.
    const keys = gamemodes.map((gm) => this.valkeyKey(gm));
    const cachedValues = await this.valkey.mget(...keys);

    // For any gamemode whose cache has expired, regenerate on-demand.
    const gamemodeIds: [Gamemode, number[]][] = await Promise.all(
      gamemodes.map(async (gm, i) => {
        const raw = cachedValues[i];
        const ids: number[] = raw ? (JSON.parse(raw) as number[]) : [];
        return [gm, ids] as [Gamemode, number[]];
      })
    );

    return gamemodeIds
      .filter(([, ids]) => ids.length > 0)
      .map(([gamemode, mapIDs]) =>
        DtoFactory(FeaturedMapsForGamemodeDto, { gamemode, mapIDs })
      );
  }

  private async refreshFeaturedMaps(): Promise<void> {
    this.logger.log('Refreshing featured maps cache');
    const results = await Promise.all(
      this.getActiveGamemodes().map((gm) => this.refreshForGamemode(gm))
    );

    const pipeline = this.valkey.pipeline();
    for (const [key, value] of results) {
      pipeline.set(key, value);
    }
    await pipeline.exec();
  }

  private async refreshForGamemode(
    gamemode: Gamemode
  ): Promise<[key: string, value: string]> {
    const slots = this.getTierSlots(gamemode);
    const mapIds: number[] = [];

    for (const [minTier, maxTier] of slots) {
      const candidates = await this.db.mMap.findMany({
        where: {
          status: MapStatus.APPROVED,
          leaderboards: {
            some: {
              gamemode,
              trackType: TrackType.MAIN,
              type: LeaderboardType.RANKED,
              tier: { gte: minTier, lte: maxTier }
            }
          }
        },
        select: { id: true }
      });

      const available = candidates.filter((c) => !mapIds.includes(c.id));
      if (available.length > 0) {
        const picked = available[Math.floor(Math.random() * available.length)];
        mapIds.push(picked.id);
      }
    }

    return [this.valkeyKey(gamemode), JSON.stringify(mapIds)];
  }

  private getActiveGamemodes(): Gamemode[] {
    return Enum.values(Gamemode).filter((gm) => !DisabledGamemodes.has(gm));
  }

  private getTierSlots(gamemode: Gamemode): FeaturedTierSlots {
    return (
      GAMEMODE_FEATURED_TIER_OVERRIDES.get(gamemode) ?? DEFAULT_FEATURED_TIERS
    );
  }

  private valkeyKey(gamemode: Gamemode): string {
    return `featured:maps:${gamemode}`;
  }
}
