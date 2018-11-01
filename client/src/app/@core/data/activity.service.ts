import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable()
export class ActivityService {
  constructor(private http: HttpClient) {}

  /**
   * @return activities of users you follow
   */
  getFollowedActivity(): Observable<any> {
    return this.http.get('/api/activities/followed');
  }

  /**
   * @param userID ID of user we are retieving
   * @return a list of specific users's activity
   */
  getUserActivity(userID: string): Observable<any> {
    return this.http.get('/api/user/' + userID + '/activities');
  }

  /**
   * @return a list of the most recent activities
   */
  getRecentActivity(): Observable<any> {
    return this.http.get('/api/activities');
  }
}
