import { MapTestingRequest as PrismaMapTestingRequest } from '@prisma/client';

export type MapTestingRequest = PrismaMapTestingRequest;

export interface CreateMapTestingRequest {
  userIDs: number[];
}

export interface UpdateMapTestingRequest {
  accept: boolean;
}
