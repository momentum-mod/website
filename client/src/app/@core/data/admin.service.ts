import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {User} from '../models/user.model';
import {MomentumMaps} from '../models/momentum-maps.model';
import {Reports} from '../models/reports.model';
import {environment} from '../../../environments/environment';

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
    return this.http.patch(environment.api + '/api/admin/maps/' + mapID, map);
  }

  /**
   * @param context the contexts of the map
   * @return a list of maps
   */
  getMaps(context?: object): Observable<MomentumMaps> {
    return this.http.get<MomentumMaps>(environment.api + '/api/admin/maps/', context);
  }

  deleteMap(mapID: number): Observable<any> {
    return this.http.delete(environment.api + '/api/admin/maps/' + mapID, {
      responseType: 'text',
    });
  }

  /**
   * @param userID ID of the user to update
   * @param user specific user's profile
   * @return Update a specific user
   */
  updateUser(userID: number, user: User): Observable<any> {
    return this.http.patch(environment.api + '/api/admin/users/' + userID, user, {
      responseType: 'text',
    });
  }

  /**
   * @param options the request options
   * @return a list of reports
   */
  getReports(options?: object): Observable<Reports> {
    return this.http.get<Reports>(environment.api + '/api/admin/reports', options || {});
  }

  /**
   * @param reportID ID of the report to update
   * @param report Report with new values of properties
   */
  updateReport(reportID: number, report: object): Observable<any> {
    return this.http.patch(environment.api + '/api/admin/reports/' + reportID, report);
  }

  /**
   * @param userStats UserStats with new values of properties
   */
  updateAllUserStats(userStats: object): Observable<any> {
    return this.http.patch(environment.api + '/api/admin/user-stats', userStats);
  }

  /**
   * @return The XP systems and their settings
   */
  getXPSystems(): Observable<any> {
    return this.http.get(environment.api + '/api/admin/xpsys');
  }

  /**
   * @param xpSystems The new XP system variables
   * @return status code 204 means it was updated
   */
  updateXPSystems(xpSystems: object): Observable<any> {
    return this.http.put(environment.api + '/api/admin/xpsys', xpSystems);
  }

  /**
   * Creates a placeholder user
   * @param alias The params of the user to use.
   */
  createUser(alias: string): Observable<any> {
    return this.http.post(environment.api + '/api/admin/users', {alias: alias});
  }

  /**
   * Deletes a user.
   * @param id The ID of the user to delete
   */
  deleteUser(id: number): Observable<any> {
    return this.http.delete(environment.api + `/api/admin/users/${id}`, {
      responseType: 'text',
    });
  }

  /**
   * Merges a placeholder user to a real user.
   * @param placeholder The placeholder user
   * @param realUser The real user
   */
  mergeUsers(placeholder: User, realUser: User): Observable<any> {
    return this.http.post(environment.api + '/api/admin/users/merge', {placeholderID: placeholder.id, realID: realUser.id}, {
      responseType: 'text',
    });
  }
}
