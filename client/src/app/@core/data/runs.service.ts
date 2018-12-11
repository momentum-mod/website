import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Runs} from '../models/runs.model';
import {Run} from '../models/run.model';

@Injectable({
  providedIn: 'root',
})
export class RunsService {

  constructor(private http: HttpClient) { }

  getRuns(options?: object): Observable<Runs> {
    return this.http.get<Runs>('/api/runs', options || {});
  }

  getRun(runID: string, options?: object): Observable<Run> {
    return this.http.get<Run>('/api/runs/' + runID, options || {});
  }

  getMapRuns(mapID: number, options?: object): Observable<Runs> {
    return this.http.get<Runs>(`/api/maps/${mapID}/runs`, options || {});
  }

}
