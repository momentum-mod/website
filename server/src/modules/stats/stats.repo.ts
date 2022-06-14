import { Injectable } from '@nestjs/common';
import { PrismaRepo } from '../prisma/prisma.repo';

@Injectable()
export class StatsRepo {
    constructor(private prisma: PrismaRepo) {}
}
