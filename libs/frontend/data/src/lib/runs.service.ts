import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from '@momentum/frontend/env';
import { PagedResponse } from '@momentum/types';
import { Run } from '@momentum/types';

@Injectable({ providedIn: 'root' })
export class RunsService {
  constructor(private http: HttpClient) {}

  // TODO: Are ANY of these used???

  getRuns(options?: object): Observable<PagedResponse<Run>> {
    return this.http.get<PagedResponse<Run>>(env.api + '/runs', options || {});
  }

  getRun(runID: string, options?: object): Observable<Run> {
    return this.http.get<Run>(env.api + '/runs/' + runID, options || {});
  }

  getMapRuns(mapID: number, options?: object): Observable<PagedResponse<Run>> {
    return this.http.get<PagedResponse<Run>>(
      `${env.api}/api/maps/${mapID}/runs`,
      options || {}
    );
  }
}
