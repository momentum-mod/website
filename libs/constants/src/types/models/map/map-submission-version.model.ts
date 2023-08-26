import { MapSubmissionVersion as PrismaMapSubmissionVersion } from '@prisma/client';

export type MapSubmissionVersion = PrismaMapSubmissionVersion;

export type CreateMapSubmissionVersion = Pick<
  MapSubmissionVersion,
  'changelog'
>;
