import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  PagedResponse,
  RunsGetAllQuery,
  RunsGetQuery
} from '@momentum/constants';
import { Run } from '@momentum/constants';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class RunsService {
  constructor(private http: HttpService) {}

  getRuns(query?: RunsGetAllQuery): Observable<PagedResponse<Run>> {
    return this.http.get<PagedResponse<Run>>('runs', { query });
  }

  getRun(runID: string, query?: RunsGetQuery): Observable<Run> {
    return this.http.get<Run>(`runs/${runID}`, { query });
  }
}
