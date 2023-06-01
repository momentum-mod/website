import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  PagedResponse,
  QueryParam,
  UsersGetQuery,
  UsersGetAllQuery,
  MapCreditsGetQuery,
  Follow
} from '@momentum/types';
import { MapCredit, Run, User } from '@momentum/types';
import { HttpClient } from '@angular/common/http';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpService) {}

  getUsers(query?: UsersGetAllQuery): Observable<PagedResponse<User>> {
    return this.http.get<PagedResponse<User>>('users', { query });
  }

  getUser(userID: number, query?: UsersGetQuery): Observable<User> {
    return this.http.get<User>(`users/${userID}`, { query });
  }

  getFollowersOfUser(user: User): Observable<PagedResponse<Follow>> {
    return this.http.get<PagedResponse<Follow>>(`users/${user.id}/followers`);
  }

  getUserFollows(user: User): Observable<PagedResponse<Follow>> {
    return this.http.get<PagedResponse<Follow>>(`users/${user.id}/follows`);
  }

  getMapCredits(
    userID: number,
    query?: MapCreditsGetQuery
  ): Observable<PagedResponse<MapCredit>> {
    return this.http.get<PagedResponse<MapCredit>>(`users/${userID}/credits`, {
      query
    });
  }
}
