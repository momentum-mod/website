import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminRepo } from './admin.repo';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from '../auth/guard/roles.guard';

@Module({
    imports: [PrismaModule],
    controllers: [AdminController],
    providers: [AdminService, UsersRepo, MapsRepo, { provide: APP_GUARD, useClass: RolesGuard }],
    exports: [AdminService]
})
export class AdminModule {}
