import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdminGetReportsQuery,
  AdminMapsGetAllQuery,
  Map,
  QueryParam,
  Report,
  UpdateReport,
  UpdateUser,
  UpdateXpSystems,
  User,
  XpSystems
} from '@momentum/types';
import { env } from '@momentum/frontend/env';
import { PagedResponse } from '@momentum/types';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  updateMap(mapID: number, map: object): Observable<any> {
    return this.http.patch(`${env.api}/v1/admin/maps/${mapID}`, map);
  }

  getMaps(query?: AdminMapsGetAllQuery): Observable<PagedResponse<Map>> {
    return this.http.get<PagedResponse<Map>>(`${env.api}/v1/admin/maps/`, {
      params: query as QueryParam
    });
  }

  deleteMap(mapID: number): Observable<string> {
    return this.http.delete(`${env.api}/v1/admin/maps/${mapID}`, {
      responseType: 'text'
    });
  }

  updateUser(userID: number, update: UpdateUser): Observable<any> {
    return this.http.patch(`${env.api}/v1/admin/users/${userID}`, update, {
      responseType: 'text'
    });
  }

  getReports(query?: AdminGetReportsQuery): Observable<PagedResponse<Report>> {
    return this.http.get<PagedResponse<Report>>(`${env.api}/v1/admin/reports`, {
      params: (query as QueryParam) || {}
    });
  }

  updateReport(reportID: number, update: UpdateReport): Observable<any> {
    return this.http.patch(`${env.api}/v1/admin/reports/${reportID}`, update);
  }

  // TODO: Delete
  updateAllUserStats(userStats: object): Observable<any> {
    return this.http.patch(`${env.api}/v1/admin/user-stats`, userStats);
  }

  getXPSystems(): Observable<XpSystems> {
    return this.http.get<XpSystems>(`${env.api}/v1/admin/xpsys`);
  }

  updateXPSystems(xpSystems: UpdateXpSystems): Observable<any> {
    return this.http.put(`${env.api}/v1/admin/xpsys`, xpSystems);
  }

  createUser(alias: string): Observable<User> {
    return this.http.post<User>(`${env.api}/v1/admin/users`, { alias });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${env.api}/v1/admin/users/${id}`, {
      responseType: 'text'
    });
  }

  mergeUsers(placeholder: User, realUser: User): Observable<any> {
    return this.http.post(
      `${env.api}/v1/admin/users/merge`,
      { placeholderID: placeholder.id, realID: realUser.id },
      { responseType: 'text' }
    );
  }
}
