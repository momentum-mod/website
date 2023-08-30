import { MapSubmission as PrismaMapSubmission } from '@prisma/client';
import {
  MapCreditType,
  MapSubmissionSuggestion,
  MapSubmissionType,
  User,
  MapSubmissionVersion,
  MapSubmissionDates
} from '../../../';
import { Jsonify } from 'type-fest';

export interface MapSubmission extends PrismaMapSubmission {
  type: MapSubmissionType;
  suggestions: Jsonify<MapSubmissionSuggestion[]>;
  placeholders: Jsonify<{ alias: string; type: MapCreditType }[]>;
  dates: MapSubmissionDates;
  submitter?: User;
  versions: MapSubmissionVersion[];
}
