import { Module } from '@nestjs/common';
import { PrismaRepo } from './prisma.repo';

@Module({
    providers: [PrismaRepo],
    exports: [PrismaRepo]
})
export class PrismaModule {}
