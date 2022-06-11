import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepo } from './users.repo';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MapsRepo } from '../maps/maps.repo';

@Module({
    imports: [HttpModule, PrismaModule],
    controllers: [UsersController],
    // TODO: Remove mapsrepo import once alex sorts stuff!!!
    providers: [UsersService, UsersRepo, MapsRepo],
    exports: [UsersService, UsersRepo]
})
export class UsersModule {}
