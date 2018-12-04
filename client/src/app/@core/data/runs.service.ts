import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RunsService {

  constructor(private http: HttpClient) { }

  getRuns(options?: object): Observable<any> {
    return this.http.get('/api/runs', options || {});
  }

  getRun(runID: string, options?: object): Observable<any> {
    return this.http.get('/api/runs/' + runID, options || {});
  }

  getMapRuns(mapID: number, options?: object): Observable<any> {
    return this.http.get(`/api/maps/${mapID}/runs`, options || {});
  }

}
