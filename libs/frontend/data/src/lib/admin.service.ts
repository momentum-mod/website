import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Map, Report, User } from '@momentum/types';
import { env } from '@momentum/frontend/env';
import { PaginatedResponse } from '@momentum/types';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  updateMap(mapID: number, map: object): Observable<any> {
    return this.http.patch(env.api + '/api/admin/maps/' + mapID, map);
  }

  getMaps(context?: object): Observable<PaginatedResponse<Map>> {
    return this.http.get<PaginatedResponse<Map>>(
      env.api + '/api/admin/maps/',
      context
    );
  }

  deleteMap(mapID: number): Observable<string> {
    return this.http.delete(env.api + '/api/admin/maps/' + mapID, {
      responseType: 'text'
    });
  }

  updateUser(userID: number, user: User): Observable<any> {
    return this.http.patch(env.api + '/api/admin/users/' + userID, user, {
      responseType: 'text'
    });
  }

  getReports(options?: object): Observable<PaginatedResponse<Report>> {
    return this.http.get<PaginatedResponse<Report>>(
      env.api + '/api/admin/reports',
      options || {}
    );
  }

  updateReport(reportID: number, report: object): Observable<any> {
    return this.http.patch(env.api + '/api/admin/reports/' + reportID, report);
  }

  updateAllUserStats(userStats: object): Observable<any> {
    return this.http.patch(env.api + '/api/admin/user-stats', userStats);
  }

  getXPSystems(): Observable<any> {
    return this.http.get(env.api + '/api/admin/xpsys');
  }

  updateXPSystems(xpSystems: object): Observable<any> {
    return this.http.put(env.api + '/api/admin/xpsys', xpSystems);
  }

  createUser(alias: string): Observable<any> {
    return this.http.post(env.api + '/api/admin/users', {
      alias: alias
    });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(env.api + `/api/admin/users/${id}`, {
      responseType: 'text'
    });
  }

  mergeUsers(placeholder: User, realUser: User): Observable<any> {
    return this.http.post(
      env.api + '/api/admin/users/merge',
      { placeholderID: placeholder.id, realID: realUser.id },
      { responseType: 'text' }
    );
  }
}
