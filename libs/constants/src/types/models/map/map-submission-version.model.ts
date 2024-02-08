import { MapSubmissionVersion as PrismaMapSubmissionVersion } from '@prisma/client';
import { MapZones } from './map-zones.model';

export interface MapSubmissionVersion
  extends Omit<PrismaMapSubmissionVersion, 'zones'> {
  zones: MapZones;
  downloadURL: string;
  vmfDownloadUrl?: string;
}

export type CreateMapSubmissionVersion = Pick<
  MapSubmissionVersion,
  'changelog' | 'zones'
>;
