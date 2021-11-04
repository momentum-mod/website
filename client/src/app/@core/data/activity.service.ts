import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Activities} from '../models/activities.model';
import {environment} from '../../../environments/environment';

@Injectable()
export class ActivityService {
  constructor(private http: HttpClient) {}

  /**
   * @return activities of users you follow
   */
  getFollowedActivity(): Observable<Activities> {
    return this.http.get<Activities>(environment.api + '/api/user/activities/followed');
  }

  /**
   * @param userID ID of user we are retieving
   * @return a list of specific users's activity
   */
  getUserActivity(userID: number): Observable<Activities> {
    return this.http.get<Activities>(environment.api + '/api/users/' + userID + '/activities');
  }

  /**
   * @param offset number of activities offset from most recent activity
   * @return a list of the most recent activities
   */
  getRecentActivity(offset: number): Observable<Activities> {
    const params = new HttpParams().append('offset', offset.toString());
    return this.http.get<Activities>(environment.api + '/api/activities', {params});
  }
}
