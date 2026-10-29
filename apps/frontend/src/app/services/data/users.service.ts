import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  PagedQuery,
  PagedResponse,
  UsersGetQuery,
  UsersGetAllQuery,
  Follow,
  UsersGetCreditsQuery,
  MapCredit,
  User
} from '@momentum/constants';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpService);

  getUsers(query?: UsersGetAllQuery): Observable<PagedResponse<User>> {
    return this.http.get<PagedResponse<User>>('users', { query });
  }

  getUser(userID: number, query?: UsersGetQuery): Observable<User> {
    return this.http.get<User>(`users/${userID}`, { query });
  }

  getFollowersOfUser(
    user: User,
    query?: PagedQuery
  ): Observable<PagedResponse<Follow>> {
    return this.http.get<PagedResponse<Follow>>(`users/${user.id}/followers`, {
      query
    });
  }

  getUserFollows(
    user: User,
    query?: PagedQuery
  ): Observable<PagedResponse<Follow>> {
    return this.http.get<PagedResponse<Follow>>(`users/${user.id}/follows`, {
      query
    });
  }

  getMapCredits(
    userID: number,
    query?: UsersGetCreditsQuery
  ): Observable<PagedResponse<MapCredit>> {
    return this.http.get<PagedResponse<MapCredit>>(`users/${userID}/credits`, {
      query
    });
  }
}
