import { Bans as PrismaBans } from '@prisma/client';

export interface Bans extends PrismaBans {}

export interface UpdateBans extends Partial<Omit<Bans, 'userID'>> {}
