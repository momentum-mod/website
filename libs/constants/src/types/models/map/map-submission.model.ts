import { MapSubmission as PrismaMapSubmission } from '@prisma/client';
import { Jsonify } from 'type-fest';
import {
  MapSubmissionSuggestion,
  MapSubmissionType,
  User,
  MapSubmissionVersion,
  MapSubmissionDate
} from '../../../';
import { MapSubmissionPlaceholder } from './map-submission-placeholder.model';

export interface MapSubmission extends PrismaMapSubmission {
  type: MapSubmissionType;
  suggestions: Jsonify<MapSubmissionSuggestion[]>;
  placeholders: Jsonify<MapSubmissionPlaceholder[]>;
  dates: MapSubmissionDate[];
  submitter?: User;
  versions: MapSubmissionVersion[];
  currentVersion: MapSubmissionVersion;
}
