import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MapsService } from './maps.service';
import { UsersService } from './users.service';
import { RepositoryModule } from 'src/repositories/repository.module';

@Module({
  imports:[    
    HttpModule,
    RepositoryModule
  ],
  providers: [ 
    UsersService,
    MapsService
  ],
  exports: [
    UsersService,
    MapsService
  ]
})
export class ServiceModule {}
