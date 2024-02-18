import { MapTestInvite as PrismaMapTestInvite } from '@prisma/client';

export type MapTestInvite = PrismaMapTestInvite;

export interface CreateMapTestInvite {
  userIDs: number[];
}

export interface UpdateMapTestInvite {
  accept: boolean;
}
