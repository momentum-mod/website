import { MMap } from '@prisma/client';

export interface MapSummary extends Pick<MMap, 'status'> {
  statusCount: number;
}
