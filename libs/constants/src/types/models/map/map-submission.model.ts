import { MapSubmission as PrismaMapSubmission } from '@prisma/client';
import {
  MapSubmissionSuggestion,
  MapSubmissionType,
  User,
  MapSubmissionVersion,
  MapSubmissionDate
} from '../../../';
import { MapSubmissionPlaceholder } from './map-submission-placeholder.model';

export interface MapSubmission
  extends Omit<PrismaMapSubmission, 'suggestions' | 'placeholders'> {
  type: MapSubmissionType;
  suggestions: MapSubmissionSuggestion[];
  placeholders: MapSubmissionPlaceholder[];
  dates: MapSubmissionDate[];
  submitter?: User;
  versions: MapSubmissionVersion[];
  currentVersion: MapSubmissionVersion;
}
