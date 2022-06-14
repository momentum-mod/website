import { Injectable } from '@nestjs/common';
import { PrismaRepo } from '../prisma/prisma.repo';

@Injectable()
export class AdminRepo {
    constructor(private prisma: PrismaRepo) {}
}
