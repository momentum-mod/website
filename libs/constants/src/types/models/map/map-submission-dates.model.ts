import { DateString } from '../../utils';
import { MapStatus } from '../../../enums/map-status.enum';

export type MapSubmissionDate = {
  status: MapStatus;
  date: DateString;
};
