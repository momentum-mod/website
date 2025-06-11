import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { JwtService } from '@nestjs/jwt';
import * as Sentry from '@sentry/node';
import { IS_PUBLIC_KEY } from '../../../decorators';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      if (this.isPublic(context)) return true;
      throw new UnauthorizedException();
    }

    try {
      request.user = await this.jwtService.verifyAsync(token);

      if (Sentry.isInitialized()) {
        Sentry.setUser({ id: request.user.id });
      }
    } catch {
      if (this.isPublic(context)) return true;
      throw new UnauthorizedException();
    }

    return true;
  }

  isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
  }

  private extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
