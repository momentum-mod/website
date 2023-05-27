import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { env } from '@momentum/frontend/env';
import {
  PagedQuery,
  PagedResponse,
  QueryParam,
  UsersGetQuery,
  UsersGetAllQuery,
  MapCreditsGetQuery,
  Follow
} from '@momentum/types';
import { MapCredit, Run, User } from '@momentum/types';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpClient) {}

  getUsers(query?: UsersGetAllQuery): Observable<PagedResponse<User>> {
    return this.http.get<PagedResponse<User>>('users', {
      params: query as QueryParam
    });
  }

  getUser(userID: number, query?: UsersGetQuery): Observable<User> {
    return this.http.get<User>(`users/${userID}`, {
      params: query as QueryParam
    });
  }

  getFollowersOfUser(user: User): Observable<PagedResponse<Follow>> {
    return this.http.get<PagedResponse<Follow>>(`users/${user.id}/followers`);
  }

  getUserFollows(user: User): Observable<PagedResponse<Follow>> {
    return this.http.get<PagedResponse<Follow>>(`users/${user.id}/follows`);
  }

  getMapCredits(
    userID: number,
    options?: MapCreditsGetQuery
  ): Observable<PagedResponse<MapCredit>> {
    return this.http.get<PagedResponse<MapCredit>>(`users/${userID}/credits`, {
      params: options as QueryParam
    });
  }
}
