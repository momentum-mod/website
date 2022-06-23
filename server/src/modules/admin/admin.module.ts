import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RepoModule } from '../repo/repo.module';
import { UsersRepoService } from '../repo/users-repo.service';
import { MapsRepoService } from '../repo/maps-repo.service';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from '../auth/guard/roles.guard';

@Module({
    imports: [RepoModule],
    controllers: [AdminController],
    providers: [{ provide: APP_GUARD, useClass: RolesGuard }, AdminService, UsersRepoService, MapsRepoService],
    exports: [AdminService]
})
export class AdminModule {}
