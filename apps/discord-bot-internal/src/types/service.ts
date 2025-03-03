import { Client } from 'discord.js';

export interface Service {
  client: Client<true>;
  init?(): Promise<void> | void;
}

export class Service {
  constructor(public client: Client<true>) {}
}
