import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { env } from '@momentum/frontend/env';

@Injectable({ providedIn: 'root' })
export class StatsService {
  constructor(private _http: HttpClient) {}

  // We haven't ported this from old API to Nest, going to rethink stats
  // completely. Leaving stubbed for now.
  // getGlobalBaseStats(): Observable<GlobalBaseStats> {
  //   return this.http.get<GlobalBaseStats>(
  //     env.api + '/api/stats/global'
  //   );
  // }
  //
  // getGlobalMapStats(): Observable<GlobalMapStats> {
  //   return this.http.get<GlobalMapStats>(
  //     env.api + '/api/stats/global/maps'
  //   );
  // }
}
