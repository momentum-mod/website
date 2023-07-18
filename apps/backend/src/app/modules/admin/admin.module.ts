import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DbModule } from '../database/db.module';
import { MapsModule } from '../maps/maps.module';
import { XpSystemsModule } from '../xp-systems/xp-systems.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [DbModule, MapsModule, XpSystemsModule, UsersModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
