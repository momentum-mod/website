import { PagedQuery } from './pagination.model';

export type NotificationsMarkAsReadQuery = {
  notifIDs?: number[];
  all?: boolean;
};

export type NotificationsGetQuery = PagedQuery & {};
