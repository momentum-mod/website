import { MapSubmissionVersion as PrismaMapSubmissionVersion } from '@prisma/client';
import { MapZones } from './map-zones.model';

export interface MapSubmissionVersion
  extends Omit<PrismaMapSubmissionVersion, 'zones'> {
  zones: MapZones;
  downloadURL: string;
  vmfDownloadURL?: string;
}

export interface CreateMapSubmissionVersion
  extends Pick<MapSubmissionVersion, 'changelog' | 'zones'> {
  resetLeaderboards?: boolean;
}

export interface CreateMapSubmissionVersionWithFiles {
  bsp: File;
  vmfs: File[];
  data: CreateMapSubmissionVersion;
}
