import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  LeaderboardRun,
  MapLeaderboardGetQuery,
  PagedResponse
} from '@momentum/constants';
import { HttpService } from './http.service';
import { MapLeaderboardGetRunQuery } from '@momentum/backend/dto';

@Injectable({ providedIn: 'root' })
export class LeaderboardsService {
  constructor(private http: HttpService) {}

  getRuns(
    mapID: number,
    query: MapLeaderboardGetQuery
  ): Observable<PagedResponse<LeaderboardRun>> {
    return this.http.get<PagedResponse<LeaderboardRun>>(
      `maps/${mapID}/leaderboard`,
      { query }
    );
  }

  getRun(
    mapID: number,
    query: MapLeaderboardGetRunQuery
  ): Observable<LeaderboardRun> {
    return this.http.get<LeaderboardRun>(`maps/${mapID}/leaderboard/unique`, {
      query
    });
  }

  getFriendRuns(
    mapID: number,
    query: Omit<MapLeaderboardGetQuery, 'filter'>
  ): Observable<PagedResponse<LeaderboardRun>> {
    return this.http.get<PagedResponse<LeaderboardRun>>(
      `maps/${mapID}/leaderboards`,
      { query: { ...query, filter: 'friends' } }
    );
  }

  getAroundFriends(
    mapID: number,
    query: Omit<MapLeaderboardGetQuery, 'filter'>
  ): Observable<PagedResponse<LeaderboardRun>> {
    return this.http.get<PagedResponse<LeaderboardRun>>(
      `maps/${mapID}/leaderboards`,
      { query: { ...query, filter: 'around' } }
    );
  }
}
