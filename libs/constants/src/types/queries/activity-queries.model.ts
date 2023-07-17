import { PagedQuery } from './pagination.model';
import { ActivityType } from '../../enums/activity-type.enum';

export type ActivitiesGetQuery = PagedQuery & {
  userID?: number;
  type?: ActivityType;
  data?: number;
};
