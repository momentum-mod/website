import { InteractionModule } from '../types/interaction-module';
import { CustomModule, SayModule } from './custom';
import { LiveStreamModule } from './live-stream';
import { TrustedModule } from './trust';
import { RestartModule } from './restart';
export const interactionModules: Array<new () => InteractionModule> = [
  CustomModule,
  SayModule,
  LiveStreamModule,
  TrustedModule,
  RestartModule
];
