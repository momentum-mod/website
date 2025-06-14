import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  PagedResponse,
  AdminActivity,
  AdminActivitiesGetQuery
} from '@momentum/constants';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class AdminActivityService {
  private http = inject(HttpService);

  getAdminActivities(
    query?: AdminActivitiesGetQuery
  ): Observable<PagedResponse<AdminActivity>> {
    return this.http.get<PagedResponse<AdminActivity>>('admin/activities', {
      query
    });
  }

  getAdminActivitiesForUser(
    adminID: number,
    query?: AdminActivitiesGetQuery
  ): Observable<PagedResponse<AdminActivity>> {
    return this.http.get<PagedResponse<AdminActivity>>(
      'admin/activities/' + adminID,
      { query }
    );
  }
}
