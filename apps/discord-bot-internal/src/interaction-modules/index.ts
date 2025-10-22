import { InteractionModule } from '../types/interaction-module';
import { CustomModule, SayModule, TellModule } from './custom';
import { LiveStreamModule } from './live-stream';
import { TrustedModule } from './trust';
import { RestartModule } from './restart';
import { RolesModule } from './roles';
export const interactionModules: Array<new () => InteractionModule> = [
  CustomModule,
  SayModule,
  TellModule,
  LiveStreamModule,
  TrustedModule,
  RestartModule,
  RolesModule
];
