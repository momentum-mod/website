import { Prisma, User, Map as MapDB, MapInfo, MapStats, MapImage, MapTrack, UserMapRank, Run } from '@prisma/client';
import { PrismaService } from '@modules/repo/prisma.service';
import { randomHash, randomSteamID } from '@tests/util/random.util';
import { gameLogin, login } from '@tests/util/auth.util';
import { MapStatus, MapType } from '@common/enums/map.enum';
import { AsyncReturnType, PartialDeep } from 'type-fest';
import { merge } from 'lodash';

const prisma: PrismaService = global.prisma;

export const NULL_ID = 999999999999999;
export const dateOffset = (offset: number) => new Date(Date.now() - offset * 1000);

export const cleanup = (...models: ('user' | 'map' | 'run' | 'report' | 'activity' | 'xpSystems')[]) =>
    prisma.$transaction(
        models.map((name) =>
            (prisma[name] as any) // >:D
                .deleteMany()
        )
    );

//#region Users

let users = 0;
const createUserData = () => ({
    steamID: randomSteamID(),
    alias: `User ${++users}`,
    profile: { create: {} },
    userStats: { create: {} }
});
type CreateUserArgs = PartialDeep<Prisma.UserCreateArgs>;

export function createUser(args: CreateUserArgs = {}): Promise<User> {
    return prisma.user.create(merge({ data: createUserData() }, args) as Prisma.UserCreateArgs);
}

export function createUsers(count: number, args: CreateUserArgs = {}): Promise<AsyncReturnType<typeof createUser>[]> {
    return Promise.all(Array.from({ length: count }, () => createUser(args)));
}

export async function createAndLoginUser(args?: CreateUserArgs): Promise<[User, string]> {
    const user = await createUser(args);
    const token = await login(user);
    return [user, token];
}

export async function createAndLoginGameUser(args?: CreateUserArgs): Promise<[User, string]> {
    const user = await createUser(args);
    const token = await gameLogin(user);
    return [user, token];
}

export async function loginNewUser(args?: CreateUserArgs): Promise<string> {
    return login(await createUser(args));
}
export async function loginNewGameUser(args?: CreateUserArgs): Promise<string> {
    return gameLogin(await createUser(args));
}

//#endregion

//#region Maps

let maps = 0;

type CreateMapMapArgs = PartialDeep<Omit<Prisma.MapCreateInput, 'tracks'>>;
type CreateMapMapTrackArgs = PartialDeep<Prisma.MapTrackCreateWithoutMapInput>;

/**
 * Create a map with generally sensible defaults for things that don't require connecting a User or Run
 */
export async function createMap(
    map: CreateMapMapArgs = {},
    track: CreateMapMapTrackArgs = {}
): Promise<MapDB & { info: MapInfo; stats: MapStats; images: MapImage[]; thumbnail: MapImage; mainTrack: MapTrack }> {
    const createdMap = await prisma.map.create({
        data: {
            ...merge(
                {
                    name: `ahop_map${++maps}`,
                    type: MapType.AHOP,
                    statusFlag: MapStatus.APPROVED,
                    hash: randomHash(),
                    info: { create: { numTracks: 1, creationDate: new Date() } },
                    images: map?.images ?? { create: {} },
                    stats: map?.stats ?? { create: { baseStats: { create: {} } } }
                },
                map
            ),
            tracks: {
                create: merge(
                    {
                        trackNum: 0,
                        numZones: 2,
                        isLinear: true,
                        difficulty: 1,
                        stats: track?.stats ?? { create: { baseStats: { create: {} } } },
                        zones: track?.zones ?? { createMany: { data: [{ zoneNum: 0 }, { zoneNum: 1 }] } }
                    },
                    track
                ) as any // I'm sorry these types are just so annoying. They're valid!!
            } as any
        } as any,
        include: { images: true, tracks: true }
    });

    return prisma.map.update({
        where: { id: createdMap.id },
        data: {
            thumbnail: createdMap.images[0] ? { connect: { id: createdMap.images[0].id } } : undefined,
            mainTrack: createdMap.tracks[0] ? { connect: { id: createdMap.tracks[0].id } } : undefined
        },
        include: { info: true, images: true, stats: true, thumbnail: true, mainTrack: { include: { zones: true } } }
    });
}

export function createMaps(
    count: number,
    map: CreateMapMapArgs = {},
    track: CreateMapMapTrackArgs = {}
): Promise<AsyncReturnType<typeof createMap>[]> {
    return Promise.all(Array.from({ length: count }, () => createMap(map, track)));
}

//#endregion

//#region Runs

export async function createRun(args: {
    map: MapDB;
    user: User;
    ticks?: number;
    flags?: number;
    createdAt?: Date;
    trackNum?: number;
    zoneNum?: number;
}): Promise<Run & { user: User; map: MapDB }> {
    // Wanna create a user, map, AND run? Go for it!
    const user = args.user ?? (await createUser());
    const map = args.map ?? (await createMap());
    const ticks = args.ticks ?? 1;

    return prisma.run.create({
        data: {
            map: { connect: { id: map.id } },
            user: { connect: { id: user.id } },
            trackNum: args.trackNum ?? 0,
            zoneNum: args.zoneNum ?? 0,
            ticks: ticks,
            tickRate: 100,
            flags: args.flags ?? 0,
            file: '',
            time: ticks,
            hash: randomHash(),
            createdAt: args.createdAt ?? undefined,
            overallStats: { create: { jumps: 1 } }
        },
        include: { user: true, map: true }
    });
}

/**
 * Create a run with attached UMR for a specific map. If a Prisma `User` is passed in, use that. Otherwise, create one.
 */
export async function createRunAndUmrForMap(
    args: {
        map?: MapDB;
        user?: User;
        ticks?: number;
        rank?: number;
        flags?: number;
        trackNum?: number;
        zoneNum?: number;
        createdAt?: Date;
        file?: string;
    } = {}
): Promise<Run & { rank: UserMapRank; user: User; map: MapDB }> {
    // Prisma unfortunately doesn't seem clever enough to let us do nested User -> Run -> UMR creation;
    // UMR needs a User to connect. So when we want to create users for this, we to create one first.
    const user = args.user ?? (await createUser());

    const map = args.map ?? (await createMap());

    const ticks = args.ticks ?? 1;

    return prisma.run.create({
        data: {
            map: { connect: { id: map.id } },
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
                    map: { connect: { id: map.id } },
                    user: { connect: { id: user.id } },
                    rank: args.rank ?? 1,
                    gameType: map.type,
                    flags: args.flags ?? 0,
                    createdAt: args.createdAt ?? undefined
                }
            },
            overallStats: { create: { jumps: 1 } }
        },
        include: { rank: true, user: true, map: true }
    });
}

//#endregion
