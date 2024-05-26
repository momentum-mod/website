import { MapSubmissionVersion as PrismaMapSubmissionVersion } from '@prisma/client';
import { ZoneDef } from './map-zones.model';

export interface MapSubmissionVersion
  extends Omit<PrismaMapSubmissionVersion, 'zones'> {
  zones: ZoneDef;
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
