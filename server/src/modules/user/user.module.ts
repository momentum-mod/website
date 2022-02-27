import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserController } from './user.controller';
import { UserRepo } from './user.repo';
import { UserService } from './user.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [PrismaModule, UsersModule, AuthModule],
    controllers: [UserController],
    providers: [UserService, UserRepo],
    exports: [UserService, UserRepo],
})
export class UserModule {}

