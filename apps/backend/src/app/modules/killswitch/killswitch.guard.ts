import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { KillswitchService } from './killswitch.service';
import { Killswitch } from './killswitch.decorator';

@Injectable()
export class KillswitchGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly killswitchService: KillswitchService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const type = this.reflector.get(Killswitch, context.getHandler());

    if (type === undefined) {
      return true;
    }

    if (this.killswitchService.checkKillswitch(type))
      throw new ServiceUnavailableException('Endpoint is currently disabled');

    return true;
  }
}
