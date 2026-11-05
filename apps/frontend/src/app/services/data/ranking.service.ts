import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Gamemode,
  PagedResponse,
  RankEntry,
  RanksGetQuery,
  UserRank
} from '@momentum/constants';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class RankingService {
  private readonly http = inject(HttpService);

  getLadder(
    gamemode: Gamemode,
    query?: RanksGetQuery
  ): Observable<PagedResponse<RankEntry>> {
    return this.http.get<PagedResponse<RankEntry>>(`ranks/${gamemode}`, {
      query
    });
  }

  getUserRanks(userID: number): Observable<UserRank[]> {
    return this.http.get<UserRank[]>(`users/${userID}/ranks`);
  }
}
