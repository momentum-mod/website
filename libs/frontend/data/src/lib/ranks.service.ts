import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from '@momentum/frontend/env';
import {
  MapRankGetNumberQuery,
  MapRanksGetQuery,
  QueryParam,
  PagedResponse,
  Rank
} from '@momentum/types';

@Injectable({ providedIn: 'root' })
export class RanksService {
  constructor(private http: HttpClient) {}

  getRanks(
    mapID: number,
    query?: MapRanksGetQuery
  ): Observable<PagedResponse<Rank>> {
    return this.http.get<PagedResponse<Rank>>(
      `${env.api}/maps/${mapID}/ranks`,
      { params: query as QueryParam }
    );
  }

  getFriendsRanks(
    mapID: number,
    query?: MapRankGetNumberQuery
  ): Observable<Rank[]> {
    return this.http.get<Rank[]>(`${env.api}/maps/${mapID}/ranks/friends`, {
      params: query as QueryParam
    });
  }

  getAroundRanks(
    mapID: number,
    query?: MapRankGetNumberQuery
  ): Observable<Rank[]> {
    return this.http.get<Rank[]>(`${env.api}/maps/${mapID}/ranks/around`, {
      params: query as QueryParam
    });
  }
}
