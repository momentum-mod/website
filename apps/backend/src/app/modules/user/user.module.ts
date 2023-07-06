import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { UserController } from './user.controller';
import { UsersModule } from '../users/users.module';
import { MapsModule } from '../maps/maps.module';

@Module({
  imports: [DbModule, UsersModule, MapsModule],
  controllers: [UserController]
})
export class UserModule {}
