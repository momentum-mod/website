import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {User} from '../models/user.model';
import {Users} from '../models/users.model';
import {Followers} from '../models/followers.model';
import {Followed} from '../models/followed.model';
import {UserCredits} from '../models/user-credits.model';
import {Runs} from '../models/runs.model';

@Injectable()
export class UsersService {

  constructor(private http: HttpClient) {
  }

  /**
   * @return a list of users
   */
  getUsers(options?: object): Observable<Users> {
    return this.http.get<Users>('/api/users', options || {});
  }

  /**
   * @param userID ID of a specific User
   * @param options The options for the request
   * @return Retrieves a specific user
   */
  getUser(userID: number, options?: object): Observable<User> {
    return this.http.get<User>('/api/users/' + userID, options || {});
  }

  /**
   * @param user specific user's profile
   * @return followers of that user
   */
  getFollowersOfUser(user: User): Observable<Followers> {
    return this.http.get<Followers>('/api/users/' + user.id + '/followers');
  }

  /**
   * @param user specific user's profile
   * @return the user's following
   */
  getUserFollows(user: User): Observable<Followed> {
    return this.http.get<Followed>('/api/users/' + user.id + '/follows');
  }

  getMapCredits(userID: number, options?: object): Observable<UserCredits> {
    return this.http.get<UserCredits>(`/api/users/${userID}/credits`, options || {});
  }

  getRunHistory(userID: number, options?: object): Observable<Runs> {
    return this.http.get<Runs>(`/api/users/${userID}/runs`, options || {});
  }
}
