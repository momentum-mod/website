import { Prisma, User, Map as MapDB, MapInfo, MapStats, MapImage, MapTrack, UserMapRank, Run } from '@prisma/client';
import { PrismaService } from '@modules/repo/prisma.service';
import { randomHash, randomSteamID } from '@tests/util/random.util';
import { gameLogin, login } from '@tests/util/auth.util';
import { MapStatus, MapType } from '@common/enums/map.enum';
import { AsyncReturnType, PartialDeep } from 'type-fest';

const prisma: PrismaService = global.prisma;

export const NULL_ID = 999999999999999;
export const dateOffset = (offset: number) => new Date(Date.now() - offset * 1000);

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
    // TODO: Replace mergeDeep with radash's assign once https://github.com/rayepps/radash/pull/249 is merged into radash.
    return prisma.user.create(mergeDeep({ data: createUserData() }, args) as Prisma.UserCreateArgs);
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
            ...mergeDeep(
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
                create: mergeDeep(
                    {
                        trackNum: 0,
                        numZones: 2,
                        isLinear: true,
                        difficulty: 1,
                        stats: track?.stats ?? { create: { baseStats: { create: {} } } },
                        zones: track?.zones ?? { createMany: { data: [{ zoneNum: 0 }, { zoneNum: 1 }] } }
                    },
                    track
                )
            }
        },
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
    ticks: number;
    flags?: number;
    createdAt?: Date;
    trackNum?: number;
    zoneNum?: number;
}): Promise<Run> {
    return prisma.run.create({
        data: {
            map: { connect: { id: args.map.id } },
            user: { connect: { id: args.user.id } },
            trackNum: args.trackNum ?? 0,
            zoneNum: args.zoneNum ?? 0,
            ticks: args.ticks,
            tickRate: 100,
            flags: args.flags ?? 0,
            file: '',
            time: args.ticks * 100,
            hash: randomHash(),
            createdAt: args.createdAt ?? undefined,
            overallStats: { create: { jumps: 1 } }
        }
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
    } = {}
): Promise<Run & { rank: UserMapRank; user: User }> {
    // Prisma unfortunately doesn't seem clever enough to let us do nested User -> Run -> UMR creation;
    // UMR needs a User to connect. So when we want to create users for this, we to create one first.
    const user = args.user ?? (await createUser());

    // Wanna create a user, map, AND run? Go for it!
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
            file: '',
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
        include: { rank: true, user: true }
    });
}

//#endregion

// TODO: Replace with radash's `assign` once https://github.com/rayepps/radash/pull/249 is merged
// Or maybe just use Lodash... 🤮
function mergeDeep(target, source) {
    if (!(isObject(target) && isObject(source))) return;

    const output = Object.assign({}, target);
    for (const key of Object.keys(source))
        if (isObject(source[key]))
            if (!(key in target)) Object.assign(output, { [key]: source[key] });
            else output[key] = mergeDeep(target[key], source[key]);
        else Object.assign(output, { [key]: source[key] });
    return output;
}
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}
