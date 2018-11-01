import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AdminService {

  constructor(private http: HttpClient) { }

  /**
   * @param mapID ID of the map to find
   * @param map Map with new values of properties
   * @return updates a specific map
   */
  updateMap(mapID: string, map: object): Observable<any> {
    return this.http.patch('/api/admin/maps/' + mapID, map);
  }

  /**
   * @param context the contexts of the map
   * @return a list of maps
   */
  getMaps(context?: object): Observable<any> {
    return this.http.get('/api/admin/maps/', context);
  }

}
