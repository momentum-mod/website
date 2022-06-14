import { Injectable } from '@nestjs/common';
import { PrismaRepo } from '../prisma/prisma.repo';

@Injectable()
export class ActivitiesRepo {
    constructor(private prisma: PrismaRepo) {}
}
