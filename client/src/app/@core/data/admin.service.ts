import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {User} from '../models/user.model';
import {MomentumMaps} from '../models/momentum-maps.model';

@Injectable({
  providedIn: 'root',
})
export class AdminService {

  constructor(private http: HttpClient) { }

  /**
   * @param mapID ID of the map to update
   * @param map Map with new values of properties
   * @return updates a specific map
   */
  updateMap(mapID: number, map: object): Observable<any> {
    return this.http.patch('/api/admin/maps/' + mapID, map);
  }

  /**
   * @param context the contexts of the map
   * @return a list of maps
   */
  getMaps(context?: object): Observable<MomentumMaps> {
    return this.http.get<MomentumMaps>('/api/admin/maps/', context);
  }

  /**
   * @param userID ID of the user to update
   * @param user specific user's profile
   * @return Update a specific user
   */
  updateUser(userID: string, user: User): Observable<any> {
    return this.http.patch('/api/admin/users/' + userID, user, {
      responseType: 'text',
    });
  }

}
