import { inject, Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Observable } from 'rxjs';
import {
  NotificationsGetQuery,
  NotificationsDeleteQuery,
  NotificationsMarkReadQuery,
  PagedNotificationResponse
} from '@momentum/constants';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpService);

  getNotifications(
    query?: NotificationsGetQuery
  ): Observable<PagedNotificationResponse> {
    return this.http.get<PagedNotificationResponse>('notifications', { query });
  }

  deleteNotifications(query?: NotificationsDeleteQuery): Observable<void> {
    return this.http.delete('notifications', { query });
  }

  markNotificationsAsRead(
    query?: NotificationsMarkReadQuery
  ): Observable<void> {
    return this.http.patch('notifications/markRead', { query });
  }
}
