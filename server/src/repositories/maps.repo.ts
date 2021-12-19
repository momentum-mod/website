import { Injectable } from '@nestjs/common';
import { PrismaRepo } from './prisma.repo';
import {
    Map,
    Prisma
} from '@prisma/client';


@Injectable()
export class MapsRepo {
    constructor(private prisma: PrismaRepo) {}

      /**
     * @summary Inserts to database
     * @returns New db record ID
    */ 
    
    async insert(newMap: Prisma.MapCreateInput): Promise<number> {
        const result = await this.prisma.map.create({
            data: newMap
        });

        return result.id;
    }
}
