import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivitiesGetQuery, Activity, PagedQuery } from '@momentum/constants';
import { PagedResponse } from '@momentum/constants';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  constructor(private http: HttpService) {}

  getFollowedActivity(query?: PagedQuery): Observable<PagedResponse<Activity>> {
    return this.http.get<PagedResponse<Activity>>('user/activities/followed', {
      query
    });
  }

  getUserActivity(
    userID: number,
    query?: PagedQuery
  ): Observable<PagedResponse<Activity>> {
    return this.http.get<PagedResponse<Activity>>(
      `users/${userID}/activities`,
      { query }
    );
  }

  getLocalUserActivity(
    query?: PagedQuery
  ): Observable<PagedResponse<Activity>> {
    return this.http.get<PagedResponse<Activity>>('user/activities', {
      query
    });
  }

  getRecentActivity(
    query?: ActivitiesGetQuery
  ): Observable<PagedResponse<Activity>> {
    return this.http.get<PagedResponse<Activity>>('activities', { query });
  }
}
