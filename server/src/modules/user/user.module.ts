import { Module } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';
import { UserController } from './user.controller';
import { UsersModule } from '../users/users.module';
import { MapsModule } from '../maps/maps.module';

@Module({
  imports: [RepoModule, UsersModule, MapsModule],
  controllers: [UserController]
})
export class UserModule {}
