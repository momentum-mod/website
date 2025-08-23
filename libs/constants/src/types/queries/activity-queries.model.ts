import { ActivityType } from '../../enums/activity-type.enum';
import { PagedQuery } from './pagination.model';

export type ActivitiesGetQuery = PagedQuery & {
  userID?: number;
  type?: ActivityType;
  data?: number;
};
