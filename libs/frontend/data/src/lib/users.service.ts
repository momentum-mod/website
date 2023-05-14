import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { env } from '@momentum/frontend/env';
import { PaginatedResponse, UsersGetQuery } from '@momentum/types';
import { MapCredit, Run, User } from '@momentum/types';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpService) {}

  getUsers(options?: UsersGetQuery): Observable<PaginatedResponse<User>> {
    return this.http.get<PaginatedResponse<User>>('users', options);
  }

  getUser(userID: number, options?: object): Observable<User> {
    return this.http.get<User>(env.api + '/api/users/' + userID, options || {});
  }

  getFollowersOfUser(user: User): Observable<PaginatedResponse<User>> {
    return this.http.get<PaginatedResponse<User>>(
      env.api + '/api/users/' + user.id + '/followers'
    );
  }

  getUserFollows(user: User): Observable<PaginatedResponse<User>> {
    return this.http.get<PaginatedResponse<User>>(
      env.api + '/api/users/' + user.id + '/follows'
    );
  }

  getMapCredits(
    userID: number,
    options?: object
  ): Observable<PaginatedResponse<MapCredit>> {
    return this.http.get<PaginatedResponse<MapCredit>>(
      `${env.api}/api/users/${userID}/credits`,
      options || {}
    );
  }

  getRunHistory(
    userID: number,
    options?: object
  ): Observable<PaginatedResponse<Run>> {
    return this.http.get<PaginatedResponse<Run>>(
      `${env.api}/api/users/${userID}/runs`,
      options || {}
    );
  }
}
