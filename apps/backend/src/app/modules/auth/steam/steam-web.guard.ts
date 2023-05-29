import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { UsersService } from '../../users/users.service';
import { SteamOpenIDService } from './steam-openid.service';

@Injectable()
export class SteamWebGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly steamOpenID: SteamOpenIDService,
    private readonly userService: UsersService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: FastifyRequest = context.switchToHttp().getRequest();

    const userData = await this.steamOpenID.authenticate(request);

    request.user = await this.userService.findOrCreateFromWeb(userData);

    return true;
  }
}
