import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  LeaderboardRun,
  MapLeaderboardGetQuery,
  MapLeaderboardGetRunQuery,
  PagedResponse
} from '@momentum/constants';
import { HttpService } from './http.service';

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
}
