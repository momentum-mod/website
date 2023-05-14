import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Activities } from '../models/activities.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  constructor(private http: HttpClient) {}

  getFollowedActivity(): Observable<Activities> {
    return this.http.get<Activities>(
      environment.api + '/api/user/activities/followed'
    );
  }

  getUserActivity(userID: number): Observable<Activities> {
    return this.http.get<Activities>(
      environment.api + '/api/users/' + userID + '/activities'
    );
  }

  getRecentActivity(offset: number): Observable<Activities> {
    const params = new HttpParams().append('offset', offset.toString());
    return this.http.get<Activities>(environment.api + '/api/activities', {
      params
    });
  }
}
