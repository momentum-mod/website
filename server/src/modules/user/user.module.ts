import { Module } from '@nestjs/common';
import { RepoModule } from '../repo/repo.module';
import { UserController } from './user.controller';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [RepoModule, UsersModule],
    controllers: [UserController]
})
export class UserModule {}
