import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Activities} from '../models/activities.model';

@Injectable()
export class ActivityService {
  constructor(private http: HttpClient) {}

  /**
   * @return activities of users you follow
   */
  getFollowedActivity(): Observable<Activities> {
    return this.http.get<Activities>('/api/user/activities/followed');
  }

  /**
   * @param userID ID of user we are retieving
   * @return a list of specific users's activity
   */
  getUserActivity(userID: number): Observable<Activities> {
    return this.http.get<Activities>('/api/users/' + userID + '/activities');
  }

  /**
   * @return a list of the most recent activities
   */
  getRecentActivity(): Observable<Activities> {
    return this.http.get<Activities>('/api/activities');
  }
}
