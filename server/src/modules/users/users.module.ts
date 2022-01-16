import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepo } from './users.repo';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports:[    
    HttpModule,
    PrismaModule
  ],
  controllers: [
    UsersController
  ],
  providers: [ 
    UsersService,
    UsersRepo
  ],
  exports: [
    UsersService,
    UsersRepo
  ]
})
export class UsersModule {}
