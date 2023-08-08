import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ActivitiesGetQuery, Activity } from '@momentum/constants';
import { PagedResponse } from '@momentum/constants';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  constructor(private http: HttpService) {}

  getFollowedActivity(): Observable<PagedResponse<Activity>> {
    return this.http.get<PagedResponse<Activity>>('user/activities/followed');
  }

  getUserActivity(userID: number): Observable<PagedResponse<Activity>> {
    return this.http.get<PagedResponse<Activity>>(`users/${userID}/activities`);
  }

  getRecentActivity(
    query: ActivitiesGetQuery
  ): Observable<PagedResponse<Activity>> {
    return this.http.get<PagedResponse<Activity>>('activities', { query });
  }
}
