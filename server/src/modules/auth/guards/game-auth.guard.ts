import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UserJwtAccessPayloadVerified } from '@modules/auth/auth.interfaces';

@Injectable()
export class GameAuthGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        return (request.user as UserJwtAccessPayloadVerified).gameAuth === true;
    }
}

@Injectable()
export class NonGameAuthGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        return (request.user as UserJwtAccessPayloadVerified).gameAuth === false;
    }
}
