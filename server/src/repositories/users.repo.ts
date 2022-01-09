import { Injectable } from '@nestjs/common';
import { PrismaRepo } from './prisma.repo';
import {
    User,
    Prisma,
    UserAuth,
    Activity,
    Profile,
    Follow
} from '@prisma/client';


@Injectable()
export class UserRepo {
    constructor(private prisma: PrismaRepo) {}

    //#region Main User functions
    /**
     * @summary Inserts to database
     * @returns New db record ID
    */     
    async Insert(
        newUser: Prisma.UserCreateInput
    ): Promise<User> {
        return await this.prisma.user.create({
            data: newUser
        });
    }

    /**
     * @summary Gets all from database
     * @returns All users 
    */     
    async GetAll(
        where?: Prisma.UserWhereInput,
        skip?: number,
        take?: number
    ): Promise<[User[], number]> {
        const count = await this.prisma.user.count({
            where: where,
            skip: skip,
            take: take
        })
        const users = await this.prisma.user.findMany({                    
            where: where,
            skip: skip,
            take: take
        })
        return [users, count]            
    }

    /**
     * @summary Gets single user from database
     * @returns Target user or null 
    */       
    async Get(where: Prisma.UserWhereUniqueInput): Promise<User> {
        return await this.prisma.user.findFirst({                    
            where: where
        })   
    }

	async Update(user: Prisma.UserAuthWhereUniqueInput, update: Prisma.UserUpdateInput): Promise<User> {
        return await this.prisma.user.update({
            where: user,
            data: update
        });
	}
    //#endregion

    //#region User Auth funcitons
	async GetAuth(whereInput: Prisma.UserAuthWhereUniqueInput): Promise<UserAuth> {
		return await this.prisma.userAuth.findFirst({ where: whereInput });
	}

    async UpdateAuth(user: Prisma.UserAuthWhereUniqueInput, update: Prisma.UserAuthUpdateInput): Promise<UserAuth>{
        return await this.prisma.userAuth.update({
            where: user,
            data: update
        });
    }
    //#endregion

    //#region Profile
    /**
     * @summary Gets single users profile from database
     * @returns Target user or null 
    */       
	async GetProfile(userID: number): Promise<Profile> {
        const where: Prisma.ProfileWhereInput = {};
        where.userID = userID;

		return await this.prisma.profile.findFirst({
            where: where
        });
	}


    //#endregion

    //#region Activites
    async GetActivities(
            userID: number,
            skip?: number,
            take?: number
        ): Promise<[Activity[], number]> {
            
        const where: Prisma.ActivityWhereInput = {};
        where.userID = userID;

        const count = await this.prisma.activity.count({            
            where: where
        })
        const activities = await this.prisma.activity.findMany({ 
            where: where,            
            skip: skip,
            take: take,
            include: {
                users: true                             
            }
        });

        return [activities, count];
    }
    //#endregion

    
    //#region Followers
    async GetFollowers(
        userID: number,
        skip?: number,
        take?: number
    ): Promise<[Follow[], number]> {
        const where: Prisma.FollowWhereInput = {};
        const userWhere: Prisma.UserWhereInput = {
            id: userID
        };        

        where.users_follows_followeeIDTousers = userWhere;

        const count = await this.prisma.follow.count({            
            where: where
        })
        const followers = await this.prisma.follow.findMany({ 
            where: where,            
            skip: skip,
            take: take
        });

        return [followers, count];
    }

    async GetFollowed(
        userID: number,
        skip?: number,
        take?: number
    ): Promise<[Follow[], number]> {
        const where: Prisma.FollowWhereInput = {};
        const userWhere: Prisma.UserWhereInput = {
            id: userID
        };        

        where.users_follows_followedIDTousers = userWhere;

        const count = await this.prisma.follow.count({            
            where: where
        })
        const followees = await this.prisma.follow.findMany({ 
            where: where,            
            skip: skip,
            take: take
        });

        return [followees, count];
    }
    //#endregion
}
