import { Module } from '@nestjs/common';

import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';

import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { appConfig } from 'config/config';
import { JwtModule } from '@nestjs/jwt';
import { ServiceModule } from '../services/sevices.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    PassportModule,  
    JwtModule.register({
        secret: appConfig.accessToken.secret, signOptions: {
            expiresIn: appConfig.accessToken.expTime,
        },
    }),
    ServiceModule,
    HttpModule
  ],
  providers: [    
    AuthService,
    JwtAuthGuard,
    JwtStrategy,    
  ],
  exports: [       
    AuthService,
    JwtAuthGuard,
    JwtStrategy,
  ]
})
export class AuthModule {}
