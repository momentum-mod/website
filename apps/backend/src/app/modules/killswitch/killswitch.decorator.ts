import { Reflector } from '@nestjs/core';
import { KillswitchType } from '@momentum/constants';

export const Killswitch = Reflector.createDecorator<KillswitchType>();
