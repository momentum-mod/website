import {
  Leaderboard,
  LeaderboardRun,
  MapInfo,
  MapStats,
  MapSubmission,
  MapVersion,
  MMap,
  PastRun,
  Prisma,
  PrismaClient,
  User
} from '@prisma/client';
import { CamelCase, JsonValue, PartialDeep } from 'type-fest';
import { v4 as uuid4 } from 'uuid';
import { deepmerge } from '@fastify/deepmerge';
import { AuthUtil } from './auth.util';
import { randomHash, randomSteamID } from './random.util';
import {
  Gamemode,
  LeaderboardType,
  MapStatus,
  MapSubmissionType,
  RunSplits,
  Style,
  TrackType
} from '@momentum/constants';
import { ZonesStub, ZonesStubString } from '@momentum/formats/zone';
import { createSha1Hash } from './crypto.util';
import { arrayFrom } from '@momentum/util-fn';

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

  getNewUserCreateData() {
    return {
      create: {
        steamID: randomSteamID(),
        alias: `User ${++this.users}`,
        profile: { create: {} },
        userStats: { create: {} }
      }
    };
  }

  createUser(args: CreateUserArgs = {}): Promise<User> {
    return this.prisma.user.create(
      deepmerge()(
        { data: this.getNewUserCreateData().create },
        args
      ) as Prisma.UserCreateArgs
    );
  }

  createUsers(count: number, args: CreateUserArgs = {}): Promise<User[]> {
    return Promise.all(arrayFrom(count, () => this.createUser(args)));
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
      leaderboards: Leaderboard[];
      currentVersion: MapVersion;
      versions: MapVersion[];
      submission: MapSubmission;
    }
  > {
    const createdMap = await this.prisma.mMap.create({
      data: {
        ...({
          name: `ahop_map${++this.maps}`,
          status: MapStatus.APPROVED,
          info: {
            create: {
              creationDate: new Date(),
              description: 'Maps have a minimum description length now!!'
            }
          },
          images: [],
          stats: { create: {} },
          versions: {
            create: {
              versionNum: 1,
              changelog: 'hello',
              submitter: this.getNewUserCreateData(),
              bspHash: createSha1Hash(Math.random().toString()),
              zones: ZonesStubString,
              zoneHash: createSha1Hash(ZonesStubString)
            }
          },
          submission: {
            create: {
              type: MapSubmissionType.ORIGINAL,
              suggestions: [
                {
                  gamemode: Gamemode.AHOP,
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  tier: 1,
                  type: LeaderboardType.RANKED
                }
              ]
            }
          },
          submitter: this.getNewUserCreateData(),
          // Just creating the one leaderboard here, most maps will have more,
          // but isn't needed or worth the test perf hit
          leaderboards:
            (mmap?.leaderboards ?? noLeaderboards)
              ? undefined
              : {
                  create: {
                    gamemode: Gamemode.AHOP,
                    trackType: TrackType.MAIN,
                    trackNum: 1,
                    style: 0,
                    tier: 1,
                    linear: true,
                    type: LeaderboardType.RANKED
                  }
                }
        } as CreateMapMMapArgs),
        // Spread will replace any default values above with given values
        ...mmap
      } as any,
      include: { versions: true }
    });

    const latestVersion = createdMap?.versions?.at(-1)?.id;
    return this.prisma.mMap.update({
      where: { id: createdMap.id },
      data: {
        currentVersion: latestVersion
          ? { connect: { id: latestVersion } }
          : undefined
      },
      include: {
        info: true,
        stats: true,
        versions: true,
        currentVersion: true,
        leaderboards: true,
        submission: true
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
        leaderboards: Leaderboard[];
      }
    >
  > {
    return Promise.all(arrayFrom(count, () => this.createMap(map)));
  }

  /**
   * Create a map with all the leaderboards that would be generated from
   * ZonesStub, in the given modes (defaults to just ahop)
   */
  async createMapWithFullLeaderboards(
    mmap?: Omit<CreateMapMMapArgs, 'leaderboards' | 'zones'>,
    gamemodes = [Gamemode.AHOP]
  ) {
    const map = await this.createMap({
      ...mmap,
      versions: {
        create: {
          versionNum: 1,
          changelog: 'hello',
          submitter: this.getNewUserCreateData(),
          bspHash: createSha1Hash(Math.random().toString()),
          zones: ZonesStubString,
          zoneHash: createSha1Hash(JSON.stringify(ZonesStub))
        }
      },
      leaderboards: {
        createMany: {
          data: gamemodes.flatMap((gamemode) => [
            {
              gamemode,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: 0,
              tier: 1,
              linear: true,
              type: LeaderboardType.RANKED
            },
            {
              gamemode,
              trackType: TrackType.STAGE,
              trackNum: 1,
              style: 0,
              type: LeaderboardType.RANKED
            },
            {
              gamemode,
              trackType: TrackType.STAGE,
              trackNum: 2,
              style: 0,
              type: LeaderboardType.RANKED
            },
            {
              gamemode,
              trackType: TrackType.BONUS,
              trackNum: 1,
              style: 0,
              tier: 5,
              type: LeaderboardType.RANKED
            }
          ])
        }
      }
    });

    await this.prisma.mMap.update({
      data: { currentVersionID: map.versions[0].id },
      where: { id: map.id }
    });

    return map;
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
    splits?: RunSplits;
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
        splits: (args?.splits as unknown as JsonValue) ?? { segments: [] },
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
              trackNum: args?.trackNum ?? 1,
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
            trackNum: args?.trackNum ?? 1,
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
        trackNum: args?.trackNum ?? 1,
        trackType: args?.trackType ?? TrackType.MAIN,
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
                splits: {},
                leaderboard: {
                  connect: {
                    mapID_gamemode_trackType_trackNum_style: {
                      mapID: map.id,
                      gamemode: args?.gamemode ?? Gamemode.AHOP,
                      trackNum: args?.trackNum ?? 1,
                      trackType: args?.trackType ?? TrackType.MAIN,
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
type CreateMapMMapArgs = Partial<Prisma.MMapCreateInput>;

//#endregion
