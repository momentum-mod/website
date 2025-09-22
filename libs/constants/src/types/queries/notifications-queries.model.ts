import { PagedQuery } from './pagination.model';

export type NotificationsGetQuery = PagedQuery & {};

export type NotificationsDeleteQuery = {
  notificationIDs?: number[];
  all?: boolean;
};

export type NotificationsMarkReadQuery = {
  notificationIDs?: number[];
  all?: boolean;
};
