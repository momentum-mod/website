import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RepoModule } from '../repo/repo.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { XpSystemsService } from '../xp-systems/xp-systems.service';

@Module({
    imports: [RepoModule],
    controllers: [AdminController],
    providers: [{ provide: APP_GUARD, useClass: RolesGuard }, AdminService, XpSystemsService],
    exports: [AdminService]
})
export class AdminModule {}
