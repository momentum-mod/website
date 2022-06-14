import { Injectable } from '@nestjs/common';
import { PrismaRepo } from '../prisma/prisma.repo';

@Injectable()
export class RunsRepo {
    constructor(private prisma: PrismaRepo) {}
}
