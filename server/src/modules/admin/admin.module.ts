import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RepoModule } from '../repo/repo.module';
import { MapsModule } from '../maps/maps.module';
import { XpSystemsModule } from '@modules/xp-systems/xp-systems.module';

@Module({
  imports: [RepoModule, MapsModule, XpSystemsModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
