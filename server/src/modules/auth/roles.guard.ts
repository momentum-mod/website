import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@common/enums/user.enum';
import { ROLES_KEY } from '@common/decorators/roles.decorator';
import { UsersRepoService } from '@modules/repo/users-repo.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly userRepo: UsersRepoService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();

    // Note that we're not storing this on the JWT. We *could* encode roles and bans using bitflags and store
    // easily, but then you have the standard stateless/JWT problem of not being to invalidate tokens when a role
    // is updated. This is particularly nasty for the case of a user's bans being updated - a user could be issued
    // a JWT with no bans, get banned from, say, run submission, yet would still hold a JWT with no bans until it
    // expires. So, we can't trust a JWT alone to tell us a user is not banned from performing some action.
    //
    // In our case, since most endpoints are *not* role or ban dependent, it's easiest to handle RBAC using (still
    // relatively cheap) DB calls.
    const user: any = await this.userRepo.get(request.user.id, { roles: true });
    return requiredRoles.some((role) => user.roles?.[role] === true);
  }
}
