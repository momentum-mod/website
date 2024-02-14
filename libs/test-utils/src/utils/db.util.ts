import {
  Leaderboard,
  LeaderboardRun,
  MapImage,
  MapInfo,
  MapStats,
  MapSubmission,
  MapSubmissionVersion,
  MMap,
  PastRun,
  Prisma,
  PrismaClient,
  User
} from '@prisma/client';
import { CamelCase, JsonValue, PartialDeep } from 'type-fest';
import { v4 as uuid4 } from 'uuid';
import { merge } from 'lodash'; // TODO: Replace with fastify deepmerge when everything is passing!
import { AuthUtil } from './auth.util';
import { randomHash, randomSteamID } from './random.util';
import {
  Gamemode,
  MapStatus,
  MapSubmissionType,
  RunStats,
  Style,
  TrackType
} from '@momentum/constants';
import { ZonesStub } from '@momentum/formats/zone';
import { createSha1Hash } from './crypto.util';

export const NULL_ID = 999999999;

/**
 * Returns a date an `offset` number of seconds *in the future*.
 * Prisma/Postgres won't let us set a date in past, so always positive numbers,
 * where largest offset is furthest in the future
 * @param offset
 */
export const futureDateOffset = (offset: number) =>
  new Date(Date.now() + offset * 1000);

export class DbUtil {
  constructor(prisma: PrismaClient, authUtil?: AuthUtil) {
    this.prisma = prisma;
    this.auth = authUtil;
    this.users = 0;
    this.maps = 0;
  }

  private readonly prisma: PrismaClient;
  private readonly auth: AuthUtil;
  private users: number;
  private maps: number;

  uuid(): string {
    return uuid4();
  }
  cleanup(...models: CamelCase<Prisma.ModelName>[]) {
    return this.prisma.$transaction(
      models.map((name) =>
        (this.prisma[name] as any) // >:D
          .deleteMany()
      )
    );
  }

  //#region Users

  private createUserData() {
    return {
      steamID: randomSteamID(),
      alias: `User ${++this.users}`,
      profile: { create: {} },
      userStats: { create: {} }
    };
  }

  createUser(args: CreateUserArgs = {}): Promise<User> {
    return this.prisma.user.create(
      merge(
        {
          data: this.createUserData()
        },
        args
      ) as Prisma.UserCreateArgs
    );
  }

  createUsers(count: number, args: CreateUserArgs = {}): Promise<User[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.createUser(args))
    );
  }

  async createAndLoginUser(args?: CreateUserArgs): Promise<[User, string]> {
    const user = await this.createUser(args);
    const token = this.auth.login(user);
    return [user, token];
  }

  async createAndLoginGameUser(args?: CreateUserArgs): Promise<[User, string]> {
    const user = await this.createUser(args);
    const token = this.auth.gameLogin(user);
    return [user, token];
  }

  async loginNewUser(args?: CreateUserArgs): Promise<string> {
    return this.auth.login(await this.createUser(args));
  }

  async loginNewGameUser(args?: CreateUserArgs): Promise<string> {
    return this.auth.gameLogin(await this.createUser(args));
  }

  //#endregion

  //#region Maps

  /**
   * Create a map with generally sensible defaults for things that don't
   * require connecting a User or Run
   */
  async createMap(
    mmap: CreateMapMMapArgs = {},
    noLeaderboards: boolean = false
  ): Promise<
    MMap & {
      info: MapInfo;
      stats: MapStats;
      images: MapImage[];
      thumbnail: MapImage;
      leaderboards: Leaderboard[];
      submission: MapSubmission & { versions: MapSubmissionVersion[] };
    }
  > {
    const createdMap = await this.prisma.mMap.create({
      data: {
        ...merge(
          {
            name: `map${++this.maps}`,
            zones: ZonesStub,
            fileName: `ahop_map${this.maps}`,
            status: MapStatus.APPROVED,
            hash: randomHash(),
            info: { create: { creationDate: new Date() } },
            images: mmap?.images ?? [],
            stats: mmap?.stats ?? { create: {} },
            submission: mmap?.submission ?? {
              create: {
                type: MapSubmissionType.ORIGINAL,
                suggestions: [
                  {
                    gamemode: Gamemode.AHOP,
                    trackType: TrackType.MAIN,
                    trackNum: 0,
                    tier: 1,
                    ranked: true
                  }
                ],
                versions: {
                  create: {
                    versionNum: 1,
                    changelog: 'hello',
                    hash: createSha1Hash(Math.random().toString()),
                    zones: ZonesStub
                  }
                }
              }
            },
            submitter: mmap?.submitter ?? { create: this.createUserData() },
            // Just creating the one leaderboard here, most maps will have more,
            // but isn't needed or worth the test perf hit
            leaderboards:
              mmap?.leaderboards ?? noLeaderboards
                ? undefined
                : {
                    create: {
                      gamemode: Gamemode.AHOP,
                      trackType: TrackType.MAIN,
                      trackNum: 0,
                      style: 0,
                      tier: 1,
                      linear: true,
                      ranked: true
                    }
                  }
          } as CreateMapMMapArgs,
          mmap
        )
      } as any,
      include: { submission: { include: { versions: true } } }
    });

    return this.prisma.mMap.update({
      where: { id: createdMap.id },
      data: {
        thumbnail: createdMap.images[0]
          ? { connect: { id: createdMap.images[0].id } }
          : undefined,
        submission: createdMap?.submission?.versions?.[0]
          ? {
              update: {
                currentVersion: {
                  connect: { id: createdMap.submission.versions[0].id }
                }
              }
            }
          : undefined
      },
      include: {
        info: true,
        images: true,
        stats: true,
        thumbnail: true,
        leaderboards: true,
        submission: { include: { versions: true, currentVersion: true } }
      }
    });
  }

  createMaps(
    count: number,
    map: CreateMapMMapArgs = {}
  ): Promise<
    Array<
      MMap & {
        info: MapInfo;
        stats: MapStats;
        images: MapImage[];
        thumbnail: MapImage;
        leaderboards: Leaderboard[];
      }
    >
  > {
    return Promise.all(
      Array.from({ length: count }, () => this.createMap(map))
    );
  }

  /**
   * Create a map with all the leaderboards that would be generated from
   * ZonesStub, in Ahop
   */
  createMapWithFullLeaderboards(
    mmap?: Omit<CreateMapMMapArgs, 'leaderboards' | 'zones'>
  ) {
    return this.createMap({
      ...mmap,
      zones: ZonesStub,
      leaderboards: {
        createMany: {
          data: [
            {
              gamemode: Gamemode.AHOP,
              trackType: TrackType.MAIN,
              trackNum: 0,
              style: 0,
              tier: 1,
              linear: true,
              ranked: true
            },
            {
              gamemode: Gamemode.AHOP,
              trackType: TrackType.STAGE,
              trackNum: 0,
              style: 0,
              ranked: true
            },
            {
              gamemode: Gamemode.AHOP,
              trackType: TrackType.STAGE,
              trackNum: 1,
              style: 0,
              ranked: true
            },
            {
              gamemode: Gamemode.AHOP,
              trackType: TrackType.BONUS,
              trackNum: 0,
              style: 0,
              tier: 5,
              ranked: true
            }
          ]
        }
      }
    });
  }

  //#endregion

  //#region Runs

  async createLbRun(args: {
    rank: number; // TODO: Will be removed eventually
    map?: MMap;
    user?: User;
    time?: number;
    createdAt?: Date;
    gamemode?: Gamemode;
    trackType?: TrackType;
    trackNum?: number;
    style?: Style;
    flags?: number[];
    stats?: RunStats;
  }): Promise<LeaderboardRun & { user: User; mmap: MMap }> {
    // Wanna create a user, map, AND run? Go for it!
    const user = args?.user ?? (await this.createUser());
    const map = args?.map ?? (await this.createMap());

    return this.prisma.leaderboardRun.create({
      data: {
        user: { connect: { id: user.id } },
        mmap: { connect: { id: map.id } },
        time: args?.time ?? 1,
        flags: args?.flags ?? [0],
        stats: (args?.stats as unknown as JsonValue) ?? {},
        replayHash: randomHash(),
        rank: args?.rank,
        rankXP: 0,
        createdAt: args?.createdAt ?? undefined,
        leaderboard: {
          connect: {
            mapID_gamemode_trackType_trackNum_style: {
              mapID: map.id,
              gamemode: args?.gamemode ?? Gamemode.AHOP,
              trackType: args?.trackType ?? TrackType.MAIN,
              trackNum: args?.trackNum ?? 0,
              style: args?.style ?? 0
            }
          }
        },
        pastRun: {
          create: {
            mmap: { connect: { id: map.id } },
            user: { connect: { id: user.id } },
            gamemode: args?.gamemode ?? Gamemode.AHOP,
            trackType: args?.trackType ?? TrackType.MAIN,
            trackNum: args?.trackNum ?? 0,
            style: args?.style ?? 0,
            time: args?.time ?? 1
          }
        }
      },
      include: { user: true, mmap: true }
    });
  }

  async createPastRun(args?: {
    map?: MMap;
    user?: User;
    createLbRun?: boolean; // default false
    lbRank?: number;
    time?: number;
    createdAt?: Date;
    gamemode?: Gamemode;
    trackType?: TrackType;
    trackNum?: number;
    style?: Style;
    flags?: number[];
  }): Promise<PastRun & { user: User; mmap: MMap }> {
    const user = args?.user ?? (await this.createUser());
    const map = args?.map ?? (await this.createMap());

    if (args?.createLbRun && !args?.lbRank)
      throw new Error('Must supply a rank if creating a leaderboard entry.');

    return this.prisma.pastRun.create({
      data: {
        user: { connect: { id: user.id } },
        mmap: { connect: { id: map.id } },
        gamemode: args?.gamemode ?? Gamemode.AHOP,
        trackNum: args?.trackNum ?? 0,
        trackType: args?.trackType ?? 0,
        style: args?.style ?? 0,
        time: args?.time ?? 1,
        flags: args?.flags ?? [0],
        leaderboardRun: args?.createLbRun
          ? {
              create: {
                mmap: { connect: { id: map.id } },
                user: { connect: { id: user.id } },
                time: args?.time ?? 1,
                flags: args?.flags ?? [0],
                rank: args?.lbRank,
                stats: {},
                leaderboard: {
                  connect: {
                    mapID_gamemode_trackType_trackNum_style: {
                      mapID: map.id,
                      gamemode: args?.gamemode ?? Gamemode.AHOP,
                      trackNum: args?.trackNum ?? 0,
                      trackType: args?.trackType ?? 0,
                      style: args?.style ?? 0
                    }
                  }
                }
              } as Prisma.LeaderboardRunCreateWithoutPastRunInput
            }
          : undefined
      } as Prisma.PastRunCreateInput,
      include: { user: true, mmap: true, leaderboardRun: true }
    });
  }

  //#endregion
}

//#region Types

type CreateUserArgs = PartialDeep<Prisma.UserCreateArgs>;
type CreateMapMMapArgs = PartialDeep<Prisma.MMapCreateInput>;

//#endregion
