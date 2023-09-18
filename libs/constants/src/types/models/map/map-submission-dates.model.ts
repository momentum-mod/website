import { DateString } from '../../utils';
import { MapStatusNew } from '../../../enums/map-status.enum';

export type MapSubmissionDate = {
  status: MapStatusNew;
  date: DateString;
};
