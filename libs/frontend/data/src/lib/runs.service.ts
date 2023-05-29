import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from '@momentum/frontend/env';
import {
  PagedResponse,
  QueryParam,
  RunsGetAllQuery,
  RunsGetQuery
} from '@momentum/types';
import { Run } from '@momentum/types';

@Injectable({ providedIn: 'root' })
export class RunsService {
  constructor(private http: HttpClient) {}

  getRuns(query?: RunsGetAllQuery): Observable<PagedResponse<Run>> {
    return this.http.get<PagedResponse<Run>>(`${env.api}/v1/runs`, {
      params: query as QueryParam
    });
  }

  getRun(runID: string, query?: RunsGetQuery): Observable<Run> {
    return this.http.get<Run>(`${env.api}/v1/runs/${runID}`, {
      params: query as QueryParam
    });
  }
}
