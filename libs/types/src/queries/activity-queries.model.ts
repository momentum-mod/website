import { ActivityType } from '@momentum/constants';
import { PaginationQuery } from './pagination.model';

export interface ActivitiesGetQuery extends PaginationQuery {
  userID: number;
  type: ActivityType;
  data: number;
}
