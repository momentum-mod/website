import { PagedQuery } from './pagination.model';

export type NotificationsDeleteQuery = {
  notificationIDs?: number[];
  all?: boolean;
};

export type NotificationsGetQuery = PagedQuery & {};
