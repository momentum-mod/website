import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {User} from '../models/user.model';

@Injectable()
export class UsersService {

  constructor(private http: HttpClient) {
  }

  /**
   * @param none
   * @return a list of users
   */
  getUsers(): Observable<any> {
    return this.http.get('/api/users/');
  }

  /**
   * @param query
   * @return expanded list of users
   */
  searchUsers(query: string): Observable<any> {
    return this.http.get('/api/users?expand=profile&search=' + query);
  }

  /**
   * @param userID
   * @return Retrieves a specific user
   */
  getUser(userID: string): Observable<any> {
    return this.http.get('/api/users/' + userID + '?expand=profile');
  }

  /**
   * @param user
   * @return Update a specific user
   */
  updateUser(user: User): Observable<any> {
    const httpOptions = {};
    return this.http.patch('/api/admin/users/' + user.id, user, httpOptions);
  }

  getFollowersOfUser(user: User): Observable<any> {
    return this.http.get('/api/users/' + user.id + '/followers');
  }

  getUserFollows(user: User): Observable<any> {
    return this.http.get('/api/users/' + user.id + '/follows');
  }
}
