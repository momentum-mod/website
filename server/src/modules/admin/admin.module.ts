import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminRepo } from './admin.repo';

@Module({
    imports: [PrismaModule],
    controllers: [AdminController],
    providers: [AdminService, AdminRepo],
    exports: [AdminService]
})
export class AdminModule {}
