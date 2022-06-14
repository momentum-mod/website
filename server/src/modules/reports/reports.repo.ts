import { Injectable } from '@nestjs/common';
import { PrismaRepo } from '../prisma/prisma.repo';

@Injectable()
export class ReportsRepo {
    constructor(private prisma: PrismaRepo) {}
}
