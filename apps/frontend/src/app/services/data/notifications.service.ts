import { inject, Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { Observable } from 'rxjs';
import {
  PagedResponse,
  Notification,
  NotificationsGetQuery,
  NotificationsMarkAsReadQuery
} from '@momentum/constants';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpService);

  getNotifications(
    query?: NotificationsGetQuery
  ): Observable<PagedResponse<Notification>> {
    return this.http.get<PagedResponse<Notification>>('notifications', {
      query
    });
  }

  markAsRead(query?: NotificationsMarkAsReadQuery): Observable<void> {
    return this.http.delete('notifications/markAsRead', { query });
  }
}
