import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RepoModule } from '../repo/repo.module';
import { XpSystemsService } from '../xp-systems/xp-systems.service';

@Module({
    imports: [RepoModule],
    controllers: [AdminController],
    providers: [AdminService, XpSystemsService],
    exports: [AdminService]
})
export class AdminModule {}
