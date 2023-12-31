import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { UsersModule } from '../users/users.module';
import { MapsModule } from '../maps/maps.module';
import { UserController } from './user.controller';

@Module({
  imports: [DbModule.forRoot(), UsersModule, MapsModule],
  controllers: [UserController]
})
export class UserModule {}
