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
    MapFavorite
} from '@prisma/client';

@Injectable()
export class UsersRepoService {
    constructor(private prisma: PrismaService) {}

    //#region Main User functions
    /**
     * @summary Inserts to database
     * @returns New db record ID
     */
    async Insert(newUser: Prisma.UserCreateInput): Promise<User> {
        return await this.prisma.user.create({
            data: newUser
        });
    }

    /**
     * @summary Count the number of users in the database
     * @returns Number of matches
     */
    async Count(where: Prisma.UserWhereInput): Promise<number> {
        return await this.prisma.user.count({
            where: where
        });
    }

    /**
     * @summary Gets all from database
     * @returns All users
     */
    async GetAll(
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

    /**
     * @summary Gets single user from database
     * @returns Target user or null
     */
    async Get(userID: number, include?: Prisma.UserInclude): Promise<User> {
        const where: Prisma.UserWhereUniqueInput = { id: userID };

        return await this.prisma.user.findUnique({
            where: where,
            include: include
        });
    }

    /**
     * @summary Gets single user from database
     * @returns Target user or null
     */
    async GetBySteamID(steamID: string): Promise<User> {
        const where: Prisma.UserWhereUniqueInput = {};
        where.steamID = steamID;

        return await this.prisma.user.findUnique({
            where: where
        });
    }

    /**
     * @summary Update a single user in database
     * @returns Target user or null
     */
    async Update(userID: number, update: Prisma.UserUpdateInput): Promise<User> {
        const where: Prisma.UserWhereUniqueInput = { id: userID };

        return await this.prisma.user.update({
            where: where,
            data: update
        });
    }

    async Create(input: Prisma.UserCreateInput): Promise<User> {
        return await this.prisma.user.create({ data: input });
    }

    async Delete(userID: number): Promise<User> {
        return await this.prisma.user.delete({
            where: {
                id: userID
            }
        });
    }

    //#endregion

    //#region User Auth functions
    async GetAuth(whereInput: Prisma.UserAuthWhereUniqueInput): Promise<UserAuth> {
        return await this.prisma.userAuth.findFirst({ where: whereInput });
    }

    async UpdateAuth(user: Prisma.UserAuthWhereUniqueInput, update: Prisma.UserAuthUpdateInput): Promise<UserAuth> {
        return await this.prisma.userAuth.update({
            where: user,
            data: update
        });
    }

    //#endregion

    //#region Profile

    async GetProfile(userID: number): Promise<Profile> {
        const where: Prisma.ProfileWhereInput = { userID: userID };

        return await this.prisma.profile.findFirst({
            where: where
        });
    }

    //#endregion

    //#region Activites

    async GetActivities(where: Prisma.ActivityWhereInput, skip?: number, take?: number): Promise<[Activity[], number]> {
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

    async UpdateActivities(where: Prisma.ActivityWhereInput, update: Prisma.ActivityUncheckedUpdateManyInput) {
        await this.prisma.activity.updateMany({
            where: where,
            data: update
        });
    }

    //#endregion

    //#region Followers

    async GetFollowers(userID: number, skip?: number, take?: number): Promise<[Follow[], number]> {
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

    async GetFollowing(userID: number, skip?: number, take?: number): Promise<[Follow[], number]> {
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

    async GetFollower(followeeID: number, followedID: number): Promise<Follow> {
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

    async CreateFollow(followeeID: number, followedID: number) {
        await this.prisma.follow.create({
            data: {
                followedID: followedID,
                followeeID: followeeID
            }
        });
    }

    async UpdateFollow(followeeID: number, followedID: number, input: Prisma.FollowUpdateInput) {
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

    async DeleteFollow(followeeID: number, followedID: number) {
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

    async GetMapLibraryEntry(userID: number, skip: number, take: number): Promise<[MapLibraryEntry[], number]> {
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

    //#endregion

    //#region Map Favorites

    async GetFavoritedMaps(
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

    //#endregion

    //#region Notications

    async GetNotification(notificationID: number): Promise<Notification> {
        return await this.prisma.notification.findUnique({
            where: {
                id: notificationID
            }
        });
    }

    async GetNotifications(userID: number, skip?: number, take?: number): Promise<[Notification[], number]> {
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

    async UpdateNotification(notificationID: number, read: boolean) {
        await this.prisma.notification.update({
            where: {
                id: notificationID
            },
            data: {
                read: read
            }
        });
    }

    async DeleteNotification(notificationID: number) {
        await this.prisma.notification.delete({
            where: {
                id: notificationID
            }
        });
    }

    //#endregion

    //#region Map Notify

    async GetMapNotify(userID: number, mapID: number): Promise<MapNotify> {
        return await this.prisma.mapNotify.findUnique({
            where: {
                userID_mapID: {
                    userID: userID,
                    mapID: mapID
                }
            }
        });
    }

    async UpsertMapNotify(userID: number, mapID: number, notifyOn: number) {
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

    async DeleteMapNotify(userID: number, mapID: number) {
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

    async GetMapCredits(userID: number, skip?: number, take?: number): Promise<[MapCredit[], number]> {
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
    async GetRuns(userID: number, skip?: number, take?: number): Promise<[Run[], number]> {
        const where: Prisma.RunWhereInput = {
            playerID: userID
        };

        const count = await this.prisma.run.count({
            where: where
        });

        const runs = await this.prisma.run.findMany({
            where: where,
            skip: skip,
            take: take,
            include: {
                player: true,
                rank: true,
                map: true
            }
        });

        return [runs, count];
    }

    //#endregion
}
