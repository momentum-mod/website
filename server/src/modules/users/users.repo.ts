import { Injectable } from '@nestjs/common';
import { PrismaRepo } from '../prisma/prisma.repo';
import { User, Prisma, UserAuth, Activity, Profile, Follow, MapCredit, Run } from '@prisma/client';

@Injectable()
export class UsersRepo {
    constructor(private prisma: PrismaRepo) {}

    //#region Main User functions
    /**
     * @summary Inserts to database
     * @returns New db record ID
     */
    async Insert(newUser: Prisma.UserCreateInput): Promise<User> {
        return await this.prisma.user.create({
            data: newUser,
        });
    }

    /**
     * @summary Gets all from database
     * @returns All users
     */
    async GetAll(where?: Prisma.UserWhereInput, skip?: number, take?: number): Promise<[User[], number]> {
        const count = await this.prisma.user.count({
            where: where,
        });
        const users = await this.prisma.user.findMany({
            where: where,
            skip: skip != null ? +skip : undefined,
            take: take != null ? +take : undefined,
        });
        return [users, count];
    }

    /**
     * @summary Gets single user from database
     * @returns Target user or null
     */
    async Get(id: number): Promise<User> {
        const where: Prisma.UserWhereUniqueInput = {};
        where.id = +id;

        return await this.prisma.user.findFirst({
            where: where,
        });
    }

    /**
     * @summary Gets single user from database
     * @returns Target user or null
     */
    async GetBySteamID(steamID: string): Promise<User> {
        const where: Prisma.UserWhereUniqueInput = {};
        where.steamID = steamID;

        return await this.prisma.user.findFirst({
            where: where,
        });
    }

    async Update(user: Prisma.UserAuthWhereUniqueInput, update: Prisma.UserUpdateInput): Promise<User> {
        return await this.prisma.user.update({
            where: user,
            data: update,
        });
    }
    //#endregion

    //#region User Auth funcitons
    async GetAuth(whereInput: Prisma.UserAuthWhereUniqueInput): Promise<UserAuth> {
        return await this.prisma.userAuth.findFirst({ where: whereInput });
    }

    async UpdateAuth(user: Prisma.UserAuthWhereUniqueInput, update: Prisma.UserAuthUpdateInput): Promise<UserAuth> {
        return await this.prisma.userAuth.update({
            where: user,
            data: update,
        });
    }
    //#endregion

    //#region Profile
    /**
     * @summary Gets single users profile from database
     * @returns Target user or null
     */
    async GetUserProfile(userID: number): Promise<[User, Profile]> {
        const where: Prisma.UserWhereUniqueInput = {};
        where.id = +userID;

        const userProfile = await this.prisma.user.findFirst({
            where: where,
            include: {
                profiles: true,
            },
        });

        return [userProfile, (userProfile as any).profiles];
    }

    /**
     * @summary Gets only single users profile from database
     * @returns Target user or null
     */
    async GetProfileOnly(userID: number): Promise<Profile> {
        const where: Prisma.ProfileWhereInput = {};
        where.userID = +userID;

        return await this.prisma.profile.findFirst({
            where: where,
        });
    }

    //#endregion

    //#region Activites
    async GetActivities(userID: number, skip?: number, take?: number): Promise<[Activity[], number]> {
        const where: Prisma.ActivityWhereInput = {};
        where.userID = +userID;

        const count = await this.prisma.activity.count({
            where: where,
        });
        const activities = await this.prisma.activity.findMany({
            where: where,
            skip: skip != null ? +skip : undefined,
            take: take != null ? +take : undefined,
            include: {
                users: {
                    include: {
                        profiles: true,
                    },
                },
            },
        });

        return [activities, count];
    }
    //#endregion

    //#region Followers
    async GetFollowers(userID: number, skip?: number, take?: number): Promise<[Follow[], number]> {
        const where: Prisma.FollowWhereInput = {};
        const userWhere: Prisma.UserWhereInput = {
            id: +userID,
        };

        where.users_follows_followedIDTousers = userWhere;

        const count = await this.prisma.follow.count({
            where: where,
        });
        const followers = await this.prisma.follow.findMany({
            where: where,
            skip: skip != null ? +skip : undefined,
            take: take != null ? +take : undefined,
            include: {
                users_follows_followeeIDTousers: {
                    include: {
                        profiles: true,
                    },
                },
                users_follows_followedIDTousers: {
                    include: {
                        profiles: true,
                    },
                },
            },
        });

        return [followers, count];
    }

    async GetFollowing(userID: number, skip?: number, take?: number): Promise<[Follow[], number]> {
        const where: Prisma.FollowWhereInput = {};
        const userWhere: Prisma.UserWhereInput = {
            id: +userID,
        };

        where.users_follows_followeeIDTousers = userWhere;

        const count = await this.prisma.follow.count({
            where: where,
        });
        const followees = await this.prisma.follow.findMany({
            where: where,
            skip: skip != null ? +skip : undefined,
            take: take != null ? +take : undefined,
            include: {
                users_follows_followeeIDTousers: {
                    include: {
                        profiles: true,
                    },
                },
                users_follows_followedIDTousers: {
                    include: {
                        profiles: true,
                    },
                },
            },
        });

        return [followees, count];
    }
    //#endregion

    //#region Credits
    async GetMapCredits(userID: number, skip?: number, take?: number): Promise<[MapCredit[], number]> {
        const where: Prisma.MapCreditWhereInput = {};
        where.userID = +userID;

        const count = await this.prisma.mapCredit.count({
            where: where,
        });
        const mapCredit = await this.prisma.mapCredit.findMany({
            where: where,
            skip: skip ?? +skip,
            take: take ?? +take,
            include: {
                users: {
                    include: {
                        profiles: true,
                    },
                },
                maps: {
                    include: {
                        users: true,
                        mapimages: true,
                    },
                },
            },
        });

        return [mapCredit, count];
    }
    //#endregion

    //#region Runs
    async GetRuns(userID: number, skip?: number, take?: number): Promise<[Run[], number]> {
        const where: Prisma.RunWhereInput = {};
        where.playerID = +userID;

        const count = await this.prisma.run.count({
            where: where,
        });
        const runs = await this.prisma.run.findMany({
            where: where,
            skip: skip != null ? +skip : undefined,
            take: take != null ? +take : undefined,
            include: {
                users: true,
                mapranks: true,
            },
        });

        return [runs, count];
    }
    //#endregion
}
