import { Role } from '@momentum/constants';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { ALLOW_LIMITED_KEY } from '../../decorators/bypass-limited.decorator';
import { IS_PUBLIC_KEY } from '../../decorators/bypass-jwt.decorator';

@Injectable()
export class LimitedGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (this.isPublicOrAllowedToLimited(context)) return true;

    const user = await this.db.user.findUnique({
      where: { id: request.user.id },
      select: { roles: true }
    });

    // eslint-disable-next-line eqeqeq
    return (Role.LIMITED & user.roles) == 0;
  }

  isPublicOrAllowedToLimited(context: ExecutionContext) {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ||
      this.reflector.getAllAndOverride<boolean>(ALLOW_LIMITED_KEY, [
        context.getHandler(),
        context.getClass()
      ])
    );
  }
}
