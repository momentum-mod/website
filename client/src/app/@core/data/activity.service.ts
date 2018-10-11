import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable()
export class ActivityService {
  constructor(private http: HttpClient) {}

  getFollowedActivity(): Observable<any> {
    return this.http.get('/api/activities/followed');
  }
  getUserActivity(userID: string): Observable<any> {
    return this.http.get('/api/user/' + userID + '/activities');
  }
  getRecentActivity(): Observable<any> {
    return this.http.get('/api/activities');
  }
}
