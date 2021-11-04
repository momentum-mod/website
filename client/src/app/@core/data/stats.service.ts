import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {GlobalBaseStats} from '../models/global-base-stats.model';
import {GlobalMapStats} from '../models/global-map-stats.model';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class StatsService {

  constructor(private http: HttpClient) { }

  /**
   * global base stats
   */
  getGlobalBaseStats(): Observable<GlobalBaseStats> {
    return this.http.get<GlobalBaseStats>(environment.api + '/api/stats/global');
  }

  /**
   * @return global stats for all maps
   */
  getGlobalMapStats(): Observable<GlobalMapStats> {
    return this.http.get<GlobalMapStats>(environment.api + '/api/stats/global/maps');
  }

}
