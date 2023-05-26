import { ROLES_KEY } from '@momentum/backend/decorators';
import { Role } from '@momentum/constants';
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersRepoService } from '../repo/users-repo.service';
import { Bitflags } from '@momentum/bitflags';

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
    const user: any = await this.userRepo.get(request.user.id);

    // If you're not familiar with bit flags, they're just a bunch of booleans
    // encoded into a single integer. Always think of them in terms of binary
    // numbers, not decimal! Let's say the allowed roles are 0100 and 1000 (
    // so joined together as 1100). The user's roles are some combination of
    // flags (or none, in which case just 0000). By ANDing the allowed roles
    // with the actual roles, we see if any 1s line up, and if so, the resultant
    // value will be non-zero.
    //
    // E.g. if user roles are 0001 we have
    //   1100
    // & 0001 (if top and bottom place are 1, resultant place is 1, otherwise 0)
    // = 0000 = 0 (fail)
    //
    // For 0101:
    //   0101
    // & 1100
    // = 0100 != 0 (pass)
    //
    // This method saves making an SQL table full of booleans, and is easy to
    // work with once you get the general concept. Remember, rows of binary
    // digits, no decimals!
    return (Bitflags.join(...requiredRoles) & user.roles) != 0;
  }
}
