import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ERole } from '../../../@common/enums/user.enum';
import { ROLES_KEY } from '../../../@common/decorators/roles.decorator';
import { UsersRepo } from '../../users/users.repo';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector, private readonly userRepo: UsersRepo) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<ERole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        if (!requiredRoles) return true;

        const request = context.switchToHttp().getRequest();

        const user = await this.userRepo.Get(request.user.id);
        return requiredRoles.some((role) => user.roles & role);
    }
}
