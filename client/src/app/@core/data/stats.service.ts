import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class StatsService {

  constructor(private http: HttpClient) { }

  /**
   * global base stats
   */
  getGlobalBaseStats(): Observable<any> {
    return this.http.get('/api/stats/global');
  }

  /**
   * @return global stats for all maps
   */
  getGlobalMapStats(): Observable<any> {
    return this.http.get('/api/stats/global/maps');
  }

}
