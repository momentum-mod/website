import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../../../@common/enums/user.enum';
import { ROLES_KEY } from '../../../@common/decorators/roles.decorator';
import { UsersRepoService } from '../../repo/users-repo.service';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector, private readonly userRepo: UsersRepoService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<Roles[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        if (!requiredRoles) return true;

        const request = context.switchToHttp().getRequest();

        const user = await this.userRepo.Get(request.user.id);
        return requiredRoles.some((role) => user.roles & role);
    }
}
