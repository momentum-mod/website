import { Map } from '@prisma/client';

export interface MapSummary extends Pick<Map, 'status'> {
  statusCount: number;
}
