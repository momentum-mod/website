import { Notification } from './models';

export interface PagedResponse<T> {
  totalCount: number;
  returnCount: number;
  data: T[];
}

export interface PagedNotificationResponse extends PagedResponse<Notification> {
  totalUnreadCount: number;
}
