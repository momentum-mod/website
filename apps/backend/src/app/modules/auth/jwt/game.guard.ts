import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UserJwtAccessPayloadVerified } from '../auth.interface';

@Injectable()
export class GameAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return (request.user as UserJwtAccessPayloadVerified).gameAuth === true;
  }
}

@Injectable()
export class NonGameAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return (request.user as UserJwtAccessPayloadVerified).gameAuth === false;
  }
}
