import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
    Activity,
    Follow,
    MapCredit,
    MapNotify,
    Prisma,
    Profile,
    Run,
    User,
    UserAuth,
    Notification,
    MapLibraryEntry,
    MapFavorite,
    UserStats
} from '@prisma/client';

@Injectable()
export class UsersRepoService {
    constructor(private prisma: PrismaService) {}

    //#region Main User functions

    async create(input: Prisma.UserCreateInput): Promise<User> {
        // Always create corresponding profile and userStats entries
        input.profile ??= { create: {} };
        input.userStats ??= { create: {} };

        return await this.prisma.user.create({ data: input });
    }

    async count(where: Prisma.UserWhereInput): Promise<number> {
        return await this.prisma.user.count({
            where: where
        });
    }

    async getAll(
        where: Prisma.UserWhereInput,
        include: Prisma.UserInclude,
        skip?: number,
        take?: number
    ): Promise<[User[], number]> {
        const count = await this.prisma.user.count({
            where: where
        });

        const users = await this.prisma.user.findMany({
            where: where,
            include: include,
            skip: skip,
            take: take
        });

        return [users, count];
    }

    async get(userID: number, include?: Prisma.UserInclude): Promise<User> {
        const where: Prisma.UserWhereUniqueInput = { id: userID };

        return await this.prisma.user.findUnique({
            where: where,
            include: include
        });
    }

    async getBySteamID(steamID: string): Promise<User> {
        const where: Prisma.UserWhereUniqueInput = {};
        where.steamID = steamID;

        return await this.prisma.user.findUnique({
            where: where
        });
    }

    async update(userID: number, update: Prisma.UserUpdateInput): Promise<User> {
        const where: Prisma.UserWhereUniqueInput = { id: userID };

        return await this.prisma.user.update({
            where: where,
            data: update
        });
    }

    async delete(userID: number): Promise<User> {
        return await this.prisma.user.delete({
            where: { id: userID }
        });
    }

    //#endregion

    //#region User Auth functions

    async getAuth(userID: number): Promise<UserAuth> {
        return await this.prisma.userAuth.findFirst({ where: { userID: userID } });
    }

    async upsertAuth(userID: number, refreshToken: string): Promise<UserAuth> {
        return await this.prisma.userAuth.upsert({
            where: { userID: userID },
            update: { refreshToken: refreshToken },
            create: { userID: userID, refreshToken: refreshToken }
        });
    }

    //#endregion

    //#region Profile

    async getProfile(userID: number): Promise<Profile> {
        const where: Prisma.ProfileWhereInput = { userID: userID };

        return await this.prisma.profile.findFirst({
            where: where
        });
    }

    //#endregion

    //#region Activites

    async createActivities(input: Prisma.ActivityCreateManyInput[]): Promise<void> {
        await this.prisma.activity.createMany({ data: input });
    }

    async getActivities(where: Prisma.ActivityWhereInput, skip?: number, take?: number): Promise<[Activity[], number]> {
        const count = await this.prisma.activity.count({
            where: where
        });

        const activities = await this.prisma.activity.findMany({
            where: where,
            skip: skip,
            take: take,
            include: {
                user: {
                    include: {
                        profile: true
                    }
                }
            }
        });

        return [activities, count];
    }

    async deleteActivities(where: Prisma.ActivityWhereInput): Promise<void> {
        await this.prisma.activity.deleteMany({ where: where });
    }

    async updateActivities(where: Prisma.ActivityWhereInput, update: Prisma.ActivityUncheckedUpdateManyInput) {
        await this.prisma.activity.updateMany({
            where: where,
            data: update
        });
    }

    //#endregion

    //#region Followers

    async getFollowers(userID: number, skip?: number, take?: number): Promise<[Follow[], number]> {
        const where: Prisma.FollowWhereInput = {
            followedID: userID
        };

        const count = await this.prisma.follow.count({
            where: where
        });

        const follows = await this.prisma.follow.findMany({
            where: where,
            skip: skip,
            take: take,
            include: {
                followee: {
                    include: {
                        profile: true
                    }
                },
                followed: {
                    include: {
                        profile: true
                    }
                }
            }
        });

        return [follows, count];
    }

    async getFollowing(userID: number, skip?: number, take?: number): Promise<[Follow[], number]> {
        const where: Prisma.FollowWhereInput = {
            followee: {
                id: userID
            }
        };

        const count = await this.prisma.follow.count({
            where: where
        });

        const follows = await this.prisma.follow.findMany({
            where: where,
            skip: skip,
            take: take,
            include: {
                followee: {
                    include: {
                        profile: true
                    }
                },
                followed: {
                    include: {
                        profile: true
                    }
                }
            }
        });

        return [follows, count];
    }

    async getFollower(followeeID: number, followedID: number): Promise<Follow> {
        return await this.prisma.follow.findUnique({
            where: {
                followeeID_followedID: {
                    followedID: followedID,
                    followeeID: followeeID
                }
            },
            include: {
                followed: true,
                followee: true
            }
        });
    }

    async createFollow(followeeID: number, followedID: number) {
        await this.prisma.follow.create({
            data: {
                followedID: followedID,
                followeeID: followeeID
            }
        });
    }

    async updateFollow(followeeID: number, followedID: number, input: Prisma.FollowUpdateInput) {
        await this.prisma.follow.update({
            where: {
                followeeID_followedID: {
                    followedID: followedID,
                    followeeID: followeeID
                }
            },
            data: input
        });
    }

    async deleteFollow(followeeID: number, followedID: number) {
        await this.prisma.follow.delete({
            where: {
                followeeID_followedID: {
                    followedID: followedID,
                    followeeID: followeeID
                }
            }
        });
    }

    //#endregion

    //#region Map Library

    async getMapLibraryEntry(userID: number, skip: number, take: number): Promise<[MapLibraryEntry[], number]> {
        const where: Prisma.MapLibraryEntryWhereInput = {
            userID: userID
        };

        const count = await this.prisma.mapLibraryEntry.count({
            where: where
        });

        const mapLibraryEntries = await this.prisma.mapLibraryEntry.findMany({
            where: where,
            skip: skip,
            take: take,
            // TODO: move to service logic, same strat as below
            include: {
                map: true,
                user: true
            }
        });

        return [mapLibraryEntries, count];
    }

    async createMapLibraryEntry(userID: number, mapID: number) {
        await this.prisma.mapLibraryEntry.create({
            data: {
                userID: userID,
                mapID: mapID
            }
        });
    }

    async deleteMapLibraryEntry(userID: number, mapID: number) {
        await this.prisma.mapLibraryEntry.delete({
            where: {
                mapID_userID: {
                    userID: userID,
                    mapID: mapID
                }
            }
        });
    }

    //#endregion

    //#region Map Favorites

    async getFavoritedMaps(
        where: Prisma.MapFavoriteWhereInput,
        include?: Prisma.MapFavoriteInclude,
        skip?: number,
        take?: number
    ): Promise<[MapFavorite[], number]> {
        const count = await this.prisma.mapFavorite.count({
            where: where
        });

        const mapFavorites = await this.prisma.mapFavorite.findMany({
            where: where,
            include: include,
            skip: skip,
            take: take
        });

        return [mapFavorites, count];
    }

    async createFavouritedMapEntry(userID: number, mapID: number) {
        await this.prisma.mapFavorite.create({
            data: {
                userID: userID,
                mapID: mapID
            }
        });
    }

    async deleteFavouritedMapEntry(userID: number, mapID: number) {
        await this.prisma.mapFavorite.delete({
            where: {
                mapID_userID: {
                    userID: userID,
                    mapID: mapID
                }
            }
        });
    }

    //#endregion

    //#region Notications

    async getNotification(notificationID: number): Promise<Notification> {
        return await this.prisma.notification.findUnique({
            where: {
                id: notificationID
            }
        });
    }

    async getNotifications(userID: number, skip?: number, take?: number): Promise<[Notification[], number]> {
        const count = await this.prisma.notification.count({
            where: {
                userID: userID
            }
        });

        const notifications = await this.prisma.notification.findMany({
            where: {
                userID: userID
            },
            skip: skip,
            take: take,
            include: {
                user: {
                    include: {
                        profile: true
                    }
                },
                activity: true
            }
        });

        return [notifications, count];
    }

    async updateNotification(notificationID: number, read: boolean) {
        await this.prisma.notification.update({
            where: {
                id: notificationID
            },
            data: {
                read: read
            }
        });
    }

    async deleteNotification(notificationID: number) {
        await this.prisma.notification.delete({
            where: {
                id: notificationID
            }
        });
    }

    //#endregion

    //#region Map Notify

    async getMapNotify(userID: number, mapID: number): Promise<MapNotify> {
        return await this.prisma.mapNotify.findUnique({
            where: {
                userID_mapID: {
                    userID: userID,
                    mapID: mapID
                }
            }
        });
    }

    async upsertMapNotify(userID: number, mapID: number, notifyOn: number) {
        await this.prisma.mapNotify.upsert({
            where: {
                userID_mapID: {
                    userID: userID,
                    mapID: mapID
                }
            },
            update: {
                notifyOn: notifyOn
            },
            create: {
                notifyOn: notifyOn,
                mapID: mapID,
                userID: userID
            }
        });
    }

    async deleteMapNotify(userID: number, mapID: number) {
        await this.prisma.mapNotify.delete({
            where: {
                userID_mapID: {
                    userID: userID,
                    mapID: mapID
                }
            }
        });
    }

    //#endregion Map Notify

    //#region Credits

    async getMapCredits(userID: number, skip?: number, take?: number): Promise<[MapCredit[], number]> {
        const where: Prisma.MapCreditWhereInput = { userID: userID };

        const count = await this.prisma.mapCredit.count({
            where: where
        });

        const mapCredit = await this.prisma.mapCredit.findMany({
            where: where,
            skip: skip,
            take: take,
            include: {
                user: {
                    include: {
                        profile: true
                    }
                },
                map: {
                    include: {
                        submitter: true,
                        images: true
                    }
                }
            }
        });

        return [mapCredit, count];
    }

    //#endregion

    //#region Runs

    // TODO: Move to Runs module!!
    async getRuns(userID: number, skip?: number, take?: number): Promise<[Run[], number]> {
        const where: Prisma.RunWhereInput = {
            userID: userID
        };

        const count = await this.prisma.run.count({
            where: where
        });

        const runs = await this.prisma.run.findMany({
            where: where,
            skip: skip,
            take: take,
            include: {
                user: true,
                rank: true,
                map: true
            }
        });

        return [runs, count];
    }

    //#endregion

    //#region Stats

    getUserStatsUnique(where: Prisma.UserStatsWhereUniqueInput, include?: Prisma.UserStatsInclude): Promise<UserStats> {
        return this.prisma.userStats.findUnique({
            where: where,
            include: include
        });
    }

    updateUserStats(where: Prisma.UserStatsWhereUniqueInput, data: Prisma.UserStatsUpdateInput): Promise<UserStats> {
        return this.prisma.userStats.update({
            where: where,
            data: data
        });
    }

    //#endregion
}
