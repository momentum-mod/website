import { ActivityType } from '@momentum/constants';
import { PagedQuery } from './pagination.model';

export type ActivitiesGetQuery = PagedQuery & {
  userID?: number;
  type?: ActivityType;
  data?: number;
};
