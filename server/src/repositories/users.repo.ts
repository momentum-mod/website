import { Injectable } from '@nestjs/common';
import { PrismaRepo } from './prisma.repo';
import {
    User,
    Prisma,
    UserAuth
} from '@prisma/client';


@Injectable()
export class UserRepo {
    constructor(private prisma: PrismaRepo) {}

    /**
     * @summary Inserts to database
     * @returns New db record ID
    */     
    async Insert(
        newUser: Prisma.UserCreateInput
    ): Promise<User> {

        const result = await this.prisma.user.create({
            data: newUser
        });

        return result;
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
        const user = await this.prisma.user.findFirst({                    
            where: where
        })
        return user;            
    }


	async GetAuth(whereInput: Prisma.UserAuthWhereUniqueInput): Promise<UserAuth> {
		const userAuth = await this.prisma.userAuth.findFirst({ where: whereInput });
        return userAuth;
	}

	async Update(user: Prisma.UserAuthWhereUniqueInput, update: Prisma.UserUpdateInput): Promise<User> {
        return await this.prisma.user.update({
            where: user,
            data: update
        });
	}

    async UpdateAuth(user: Prisma.UserAuthWhereUniqueInput, update: Prisma.UserAuthUpdateInput): Promise<UserAuth>{
        return await this.prisma.userAuth.update({
            where: user,
            data: update
        });
    }
}
