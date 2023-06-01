import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MapRankGetNumberQuery,
  MapRanksGetQuery,
  QueryParam,
  PagedResponse,
  Rank
} from '@momentum/types';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class RanksService {
  constructor(private http: HttpService) {}

  getRanks(
    mapID: number,
    query?: MapRanksGetQuery
  ): Observable<PagedResponse<Rank>> {
    return this.http.get<PagedResponse<Rank>>(`maps/${mapID}/ranks`, { query });
  }

  getFriendsRanks(
    mapID: number,
    query?: MapRankGetNumberQuery
  ): Observable<Rank[]> {
    return this.http.get<Rank[]>(`maps/${mapID}/ranks/friends`, { query });
  }

  getAroundRanks(
    mapID: number,
    query?: MapRankGetNumberQuery
  ): Observable<Rank[]> {
    return this.http.get<Rank[]>(`maps/${mapID}/ranks/around`, { query });
  }
}
