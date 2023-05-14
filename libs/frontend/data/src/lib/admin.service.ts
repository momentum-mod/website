import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';
import { MomentumMaps } from '../models/momentum-maps.model';
import { Reports } from '../models/reports.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  updateMap(mapID: number, map: object): Observable<any> {
    return this.http.patch(environment.api + '/api/admin/maps/' + mapID, map);
  }

  getMaps(context?: object): Observable<MomentumMaps> {
    return this.http.get<MomentumMaps>(
      environment.api + '/api/admin/maps/',
      context
    );
  }

  deleteMap(mapID: number): Observable<any> {
    return this.http.delete(environment.api + '/api/admin/maps/' + mapID, {
      responseType: 'text'
    });
  }

  updateUser(userID: number, user: User): Observable<any> {
    return this.http.patch(
      environment.api + '/api/admin/users/' + userID,
      user,
      {
        responseType: 'text'
      }
    );
  }

  getReports(options?: object): Observable<Reports> {
    return this.http.get<Reports>(
      environment.api + '/api/admin/reports',
      options || {}
    );
  }

  updateReport(reportID: number, report: object): Observable<any> {
    return this.http.patch(
      environment.api + '/api/admin/reports/' + reportID,
      report
    );
  }

  updateAllUserStats(userStats: object): Observable<any> {
    return this.http.patch(
      environment.api + '/api/admin/user-stats',
      userStats
    );
  }

  getXPSystems(): Observable<any> {
    return this.http.get(environment.api + '/api/admin/xpsys');
  }

  updateXPSystems(xpSystems: object): Observable<any> {
    return this.http.put(environment.api + '/api/admin/xpsys', xpSystems);
  }

  createUser(alias: string): Observable<any> {
    return this.http.post(environment.api + '/api/admin/users', {
      alias: alias
    });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(environment.api + `/api/admin/users/${id}`, {
      responseType: 'text'
    });
  }

  mergeUsers(placeholder: User, realUser: User): Observable<any> {
    return this.http.post(
      environment.api + '/api/admin/users/merge',
      { placeholderID: placeholder.id, realID: realUser.id },
      {
        responseType: 'text'
      }
    );
  }
}
