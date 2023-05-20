import { ActivityType } from '@momentum/constants';
import { PagedQuery } from './pagination.model';

export interface ActivitiesGetQuery extends PagedQuery {
  userID: number;
  type: ActivityType;
  data: number;
}
