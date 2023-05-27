import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActivitiesGetQuery, Activity, QueryParam } from '@momentum/types';
import { PagedResponse } from '@momentum/types';
import { env } from '@momentum/frontend/env';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  constructor(private http: HttpClient) {}

  getFollowedActivity(): Observable<PagedResponse<Activity>> {
    return this.http.get<PagedResponse<Activity>>(
      `${env.api}/user/activities/followed`
    );
  }

  getUserActivity(userID: number): Observable<PagedResponse<Activity>> {
    return this.http.get<PagedResponse<Activity>>(
      `${env.api}/users/${userID}/activities`
    );
  }

  getRecentActivity(
    query: ActivitiesGetQuery
  ): Observable<PagedResponse<Activity>> {
    return this.http.get<PagedResponse<Activity>>(`${env.api}/activities`, {
      params: query as QueryParam
    });
  }
}
