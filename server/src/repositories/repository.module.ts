import { Module } from '@nestjs/common';
import { MapsRepo } from './maps.repo';
import { PrismaRepo } from './prisma.repo';
import { UserRepo } from './users.repo';

@Module({
  imports:[    
  ],
  providers: [    
    PrismaRepo,
    UserRepo,
    MapsRepo
  ],
  exports: [
    UserRepo,
    MapsRepo
  ]
})
export class RepositoryModule {}
