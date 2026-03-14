import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Gamemode,
  PagedResponse,
  QueryParamOptional,
  RankEntry,
  RankingGetQuery
} from '@momentum/constants';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class RankingService {
  private readonly http = inject(HttpService);

  getRanks(
    gamemode: Gamemode,
    query?: RankingGetQuery
  ): Observable<PagedResponse<RankEntry>> {
    return this.http.get<PagedResponse<RankEntry>>(`ranks/${gamemode}`, {
      query: query as QueryParamOptional
    });
  }
}
