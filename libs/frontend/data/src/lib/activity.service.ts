import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Activity } from '@momentum/types';
import { Paged } from '@momentum/types';
import { env } from '@momentum/frontend/env';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  constructor(private http: HttpClient) {}

  getFollowedActivity(): Observable<Paged<Activity>> {
    return this.http.get<Paged<Activity>>(
      env.api + '/api/user/activities/followed'
    );
  }

  getUserActivity(userID: number): Observable<Paged<Activity>> {
    return this.http.get<Paged<Activity>>(
      env.api + '/api/users/' + userID + '/activities'
    );
  }

  getRecentActivity(offset: number): Observable<Paged<Activity>> {
    const params = new HttpParams().append('offset', offset.toString());
    return this.http.get<Paged<Activity>>(env.api + '/api/activities', {
      params
    });
  }
}
