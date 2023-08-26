import {
  Prisma,
  User,
  MMap,
  MapInfo,
  MapStats,
  MapImage,
  MapTrack,
  Rank,
  Run,
  PrismaClient,
  MapSubmission,
  MapSubmissionVersion
} from '@prisma/client';
import { CamelCase, PartialDeep } from 'type-fest';
import { merge } from 'lodash';
import { AuthUtil } from './auth.util';
import { randomHash, randomSteamID } from './random.util';
import { MapStatus, Gamemode } from '@momentum/constants';

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
      merge({ data: this.createUserData() }, args) as Prisma.UserCreateArgs
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
    track: CreateMapMapTrackArgs = {}
  ): Promise<
    MMap & {
      info: MapInfo;
      stats: MapStats;
      images: MapImage[];
      thumbnail: MapImage;
      mainTrack: MapTrack;
      submission: MapSubmission & { versions: MapSubmissionVersion[] };
    }
  > {
    const createdMap = await this.prisma.mMap.create({
      data: {
        ...merge(
          {
            name: `map${++this.maps}`,
            fileName: `ahop_map${this.maps}`,
            type: Gamemode.AHOP,
            status: MapStatus.APPROVED,
            hash: randomHash(),
            info: { create: { numTracks: 1, creationDate: new Date() } },
            images: mmap?.images ?? { create: {} },
            stats: mmap?.stats ?? { create: { baseStats: { create: {} } } }
          },
          mmap
        ),
        tracks: {
          create: merge(
            {
              trackNum: 0,
              numZones: 2,
              isLinear: true,
              difficulty: 1,
              stats: track?.stats ?? { create: { baseStats: { create: {} } } },
              zones: track?.zones ?? {
                createMany: { data: [{ zoneNum: 0 }, { zoneNum: 1 }] }
              }
            },
            track
          ) as any // I'm sorry these types are just so annoying. They're valid!!
        } as any
      } as any,
      include: {
        images: true,
        tracks: true,
        submission: { include: { versions: true } }
      }
    });

    return this.prisma.mMap.update({
      where: { id: createdMap.id },
      data: {
        thumbnail: createdMap.images[0]
          ? { connect: { id: createdMap.images[0].id } }
          : undefined,
        mainTrack: createdMap.tracks[0]
          ? { connect: { id: createdMap.tracks[0].id } }
          : undefined
      },
      include: {
        info: true,
        images: true,
        stats: true,
        thumbnail: true,
        mainTrack: { include: { zones: true } },
        submission: { include: { versions: true } }
      }
    });
  }

  createMaps(
    count: number,
    map: CreateMapMMapArgs = {},
    track: CreateMapMapTrackArgs = {}
  ): Promise<
    (MMap & {
      info: MapInfo;
      stats: MapStats;
      images: MapImage[];
      thumbnail: MapImage;
      mainTrack: MapTrack;
    })[]
  > {
    return Promise.all(
      Array.from({ length: count }, () => this.createMap(map, track))
    );
  }

  //#endregion

  //#region Runs

  async createRun(args: {
    map: MMap;
    user: User;
    ticks?: number;
    flags?: number;
    createdAt?: Date;
    trackNum?: number;
    zoneNum?: number;
  }): Promise<Run & { user: User; mmap: MMap }> {
    // Wanna create a user, map, AND run? Go for it!
    const user = args.user ?? (await this.createUser());
    const map = args.map ?? (await this.createMap());
    const ticks = args.ticks ?? 1;

    return this.prisma.run.create({
      data: {
        mmap: { connect: { id: map.id } },
        user: { connect: { id: user.id } },
        trackNum: args.trackNum ?? 0,
        zoneNum: args.zoneNum ?? 0,
        ticks: ticks,
        tickRate: ticks * 100,
        flags: args.flags ?? 0,
        file: '',
        time: ticks,
        hash: randomHash(),
        createdAt: args.createdAt ?? undefined,
        overallStats: { create: { jumps: 1 } },
        zoneStats: {
          create: { baseStats: { create: {} }, zoneNum: args.zoneNum ?? 0 }
        }
      },
      include: { user: true, mmap: true }
    });
  }

  /**
   * Create a run with attached UMR for a specific map. If a Prisma `User` is
   * passed in, use that. Otherwise, create one.
   */
  async createRunAndRankForMap(
    args: {
      map?: MMap;
      user?: User;
      ticks?: number;
      rank?: number;
      flags?: number;
      trackNum?: number;
      zoneNum?: number;
      createdAt?: Date;
      file?: string;
    } = {}
  ): Promise<Run & { rank: Rank; user: User; mmap: MMap }> {
    // Prisma unfortunately doesn't seem clever enough to let us do nested User
    // -> Run -> UMR creation; UMR needs a User to connect. So when we want to
    // create users for this, we to create one first.
    const user = args.user ?? (await this.createUser());

    const map = args.map ?? (await this.createMap());

    const ticks = args.ticks ?? 1;

    return this.prisma.run.create({
      data: {
        mmap: { connect: { id: map.id } },
        user: { connect: { id: user.id } },
        trackNum: args.trackNum ?? 0,
        zoneNum: args.zoneNum ?? 0,
        ticks: ticks ?? 1,
        tickRate: 100,
        flags: args.flags ?? 0,
        file: args.file ?? '',
        time: ticks * 100,
        hash: randomHash(),
        createdAt: args.createdAt ?? undefined,
        rank: {
          create: {
            mmap: { connect: { id: map.id } },
            user: { connect: { id: user.id } },
            rank: args.rank ?? 1,
            gameType: map.type,
            flags: args.flags ?? 0,
            createdAt: args.createdAt ?? undefined
          }
        },
        overallStats: { create: { jumps: 1 } },
        zoneStats: {
          create: { baseStats: { create: {} }, zoneNum: args.zoneNum ?? 0 }
        }
      },
      include: { rank: true, user: true, mmap: true }
    });
  }

  //#endregion
}

//#region Types

type CreateUserArgs = PartialDeep<Prisma.UserCreateArgs>;
type CreateMapMMapArgs = PartialDeep<Omit<Prisma.MMapCreateInput, 'tracks'>>;
type CreateMapMapTrackArgs = PartialDeep<Prisma.MapTrackCreateWithoutMmapInput>;

//#endregion
