import { Inject, Injectable } from '@nestjs/common';
import { LeaderboardRun, TypedSql } from '@momentum/db';
import { type Gamemode, type Style, type TrackType } from '@momentum/constants';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../database/prisma.extension';

export interface LeaderboardQuery {
  mapID: number;
  gamemode: Gamemode;
  trackType: TrackType;
  trackNum: number;
  style: Style;
  transaction?: ExtendedPrismaServiceTransaction;
}

/**
 * Service for fetching runs for a leaderboard.
 *
 * LeaderboardRun ranks are calculated on fetch using window functions, which
 * requires pure SQL queries. This should be used over using Prisma directly
 * whenever `rank`s are needed (practically always).
 */
@Injectable()
export class LeaderboardRunsDbService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService
  ) {}

  async getRankedRuns<IncludeSplits extends boolean>(
    args: LeaderboardQuery & {
      skip?: number;
      take?: number | null;
      // Warning: only one of these at a time is supported. Could do more SQL
      // file variations but unneeded for now.
      steamIDs?: bigint[];
      userIDs?: number[];
      includeSplits?: IncludeSplits;
    }
  ): Promise<
    IncludeSplits extends true
      ? LeaderboardRun[]
      : Omit<LeaderboardRun, 'splits'>[]
  > {
    const skip = args.skip === undefined ? 0 : args.skip;
    const take = args.take === undefined ? 10 : args.take;

    let sql;
    if (args.steamIDs) {
      sql = TypedSql.getLeaderboardRunsFilterSteamIDs(
        args.mapID,
        args.gamemode,
        args.trackType,
        args.trackNum,
        args.style,
        args.steamIDs,
        skip,
        take
      );
    } else if (args.userIDs) {
      sql = TypedSql.getLeaderboardRunsFilterUserIDs(
        args.mapID,
        args.gamemode,
        args.trackType,
        args.trackNum,
        args.style,
        args.userIDs,
        skip,
        take
      );
    } else if (args.includeSplits) {
      sql = TypedSql.getLeaderboardRunsWithSplits(
        args.mapID,
        args.gamemode,
        args.trackType,
        args.trackNum,
        args.style,
        skip,
        take
      );
    } else {
      sql = TypedSql.getLeaderboardRuns(
        args.mapID,
        args.gamemode,
        args.trackType,
        args.trackNum,
        args.style,
        skip,
        take
      );
    }

    const rows: any[] = args.transaction
      ? await args.transaction.$queryRawTyped(sql)
      : await this.db.$queryRawTyped(sql);

    return rows.map(LeaderboardRunsDbService.mapRowToLeaderboardRun);
  }

  private static mapRowToLeaderboardRun(row: any): any {
    return {
      rank: row.rank,
      userID: row.userID,
      mapID: row.mapID,
      gamemode: row.gamemode,
      trackType: row.trackType,
      trackNum: row.trackNum,
      style: row.style,
      time: row.time,
      replayHash: row.replayHash,
      flags: row.flags,
      pastRunID: row.pastRunID,
      createdAt: row.createdAt,
      user: {
        id: row.user_id,
        steamID: row.user_steamID,
        alias: row.user_alias,
        avatar: row.user_avatar,
        country: row.user_country,
        roles: row.user_roles,
        bans: row.user_bans,
        createdAt: row.user_createdAt
      }
    };
  }

  /**
   * Get every track (leaderboard) on a map for a given gamemode + style, along
   * with its total completions and the given user's PB rank (null where the user
   * hasn't completed the track). The PB time is not returned - the game caches it
   * per track/style from GetMap.
   */
  async getMapUserCompletions(args: {
    mapID: number;
    gamemode: Gamemode;
    style: Style;
    userID: number;
    transaction?: ExtendedPrismaServiceTransaction;
  }): Promise<
    Array<{
      trackType: number;
      trackNum: number;
      totalCompletions: number | null;
      rank: number | null;
    }>
  > {
    const sql = TypedSql.getMapUserCompletions(
      args.mapID,
      args.gamemode,
      args.style,
      args.userID
    );

    return args.transaction
      ? await args.transaction.$queryRawTyped(sql)
      : await this.db.$queryRawTyped(sql);
  }

  /**
   * Get the given user's PB time on every leaderboard (track + style) they've
   * completed on a map. Each LeaderboardRun row is already a user's PB for that
   * leaderboard, so no aggregation is needed - and no ranks, so plain Prisma is
   * fine (unlike the rank-bearing queries above).
   */
  async getMapUserPersonalBests(args: {
    mapID: number;
    userID: number;
    transaction?: ExtendedPrismaServiceTransaction;
  }): Promise<
    Array<{
      gamemode: Gamemode;
      trackType: TrackType;
      trackNum: number;
      style: Style;
      time: number;
    }>
  > {
    const db = args.transaction ?? this.db;
    return db.leaderboardRun.findMany({
      where: { mapID: args.mapID, userID: args.userID },
      select: {
        gamemode: true,
        trackType: true,
        trackNum: true,
        style: true,
        time: true
      }
    });
  }

  /**
   * Get the rank of a user's run on a specific leaderboard.
   */
  async getUserRank(
    args: LeaderboardQuery & { userID: number }
  ): Promise<number | undefined> {
    const sql = TypedSql.getLeaderboardRunRank(
      args.mapID,
      args.gamemode,
      args.trackType,
      args.trackNum,
      args.style,
      args.userID
    );

    const runs = args.transaction
      ? await args.transaction.$queryRawTyped(sql)
      : await this.db.$queryRawTyped(sql);

    return runs?.[0]?.rank ?? undefined;
  }
}
