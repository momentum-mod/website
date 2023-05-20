import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { env } from '@momentum/frontend/env';
import { Paged, UsersGetQuery } from '@momentum/types';
import { MapCredit, Run, User } from '@momentum/types';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpService) {}

  getUsers(options?: UsersGetQuery): Observable<Paged<User>> {
    return this.http.get<Paged<User>>('users', options);
  }

  getUser(userID: number, options?: object): Observable<User> {
    return this.http.get<User>(env.api + '/api/users/' + userID, options || {});
  }

  getFollowersOfUser(user: User): Observable<Paged<User>> {
    return this.http.get<Paged<User>>(
      env.api + '/api/users/' + user.id + '/followers'
    );
  }

  getUserFollows(user: User): Observable<Paged<User>> {
    return this.http.get<Paged<User>>(
      env.api + '/api/users/' + user.id + '/follows'
    );
  }

  getMapCredits(
    userID: number,
    options?: object
  ): Observable<Paged<MapCredit>> {
    return this.http.get<Paged<MapCredit>>(
      `${env.api}/api/users/${userID}/credits`,
      options || {}
    );
  }

  getRunHistory(
    userID: number,
    options?: object
  ): Observable<Paged<Run>> {
    return this.http.get<Paged<Run>>(
      `${env.api}/api/users/${userID}/runs`,
      options || {}
    );
  }
}
