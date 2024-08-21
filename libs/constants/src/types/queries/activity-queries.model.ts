import { ActivityType } from '../../enums/activity-type.enum';
import { PagedQuery } from './pagination.model';
import { Notification } from '../../';

export type ActivitiesGetQuery = PagedQuery & {
  userID?: number;
  type?: ActivityType;
  data?: number;
};

export type UpdateNotification = Pick<Notification, 'read'>;
