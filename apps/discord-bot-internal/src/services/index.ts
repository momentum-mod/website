import { Client } from 'discord.js';
import { Service } from '../types/service';
import { UserTrustService } from './trusted';
import { SpyService } from './spy';
import { StreamsService } from './streams';
import { DailyMessageCountService } from './daily-message-count';

const services: Array<typeof Service> = [
  DailyMessageCountService,
  UserTrustService,
  SpyService,
  StreamsService
];

const initializedServices = new Map<typeof Service, Service>();

export async function initializeServices(client: Client<true>) {
  for (const serviceCtor of services) {
    const service = new serviceCtor(client);
    if (service.init) {
      await service.init();
    }
    initializedServices.set(serviceCtor, service);
  }
}

export function getService<T extends typeof Service>(ctr: T): InstanceType<T> {
  if (!initializedServices.has(ctr))
    throw new Error(
      "Attempt to get service before it's initialization: " + ctr
    );
  return initializedServices.get(ctr)! as InstanceType<T>;
}
