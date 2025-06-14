import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  PagedResponse,
  PastRun,
  RunsGetAllQuery,
  RunsGetQuery
} from '@momentum/constants';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class PastRunsService {
  private http = inject(HttpService);

  getRuns(query?: RunsGetAllQuery): Observable<PagedResponse<PastRun>> {
    return this.http.get<PagedResponse<PastRun>>('runs', { query });
  }

  getRun(runID: string, query?: RunsGetQuery): Observable<PastRun> {
    return this.http.get<PastRun>(`runs/${runID}`, { query });
  }
}
