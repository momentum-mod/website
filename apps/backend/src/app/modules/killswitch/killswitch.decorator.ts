import { Reflector } from '@nestjs/core';
import { KillswitchType } from './killswitch.enum';

export const Killswitch = Reflector.createDecorator<KillswitchType>();
