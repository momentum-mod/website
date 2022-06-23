import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class RunsRepoService {
    constructor(private prisma: PrismaService) {}
}
