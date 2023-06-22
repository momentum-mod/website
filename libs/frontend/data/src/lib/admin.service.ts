import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import {
  AdminGetReportsQuery,
  AdminMapsGetAllQuery,
  Map,
  Report,
  UpdateMap,
  UpdateReport,
  UpdateUser,
  UpdateXpSystems,
  User,
  XpSystems
} from '@momentum/types';
import { PagedResponse } from '@momentum/types';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpService) {}

  updateMap(mapID: number, body: UpdateMap): Observable<void> {
    return this.http.patch(`admin/maps/${mapID}`, { body });
  }

  getMaps(query: AdminMapsGetAllQuery): Observable<PagedResponse<Map>> {
    return this.http.get<PagedResponse<Map>>('admin/maps', { query });
  }

  deleteMap(mapID: number): Observable<void> {
    return this.http.delete(`admin/maps/${mapID}`);
  }

  updateUser(userID: number, body: UpdateUser): Observable<void> {
    return this.http.patch(`admin/users/${userID}`, { body });
  }

  getReports(query?: AdminGetReportsQuery): Observable<PagedResponse<Report>> {
    return this.http.get<PagedResponse<Report>>('admin/reports', { query });
  }

  updateReport(reportID: number, body: UpdateReport): Observable<void> {
    return this.http.patch(`admin/reports/${reportID}`, { body });
  }

  updateAllUserStats(_userStats: object): Observable<never> {
    // Removed
    return EMPTY;
  }

  getXPSystems(): Observable<XpSystems> {
    return this.http.get<XpSystems>('admin/xpsys');
  }

  updateXPSystems(body: UpdateXpSystems): Observable<void> {
    return this.http.put('admin/xpsys', { body });
  }

  createUser(alias: string): Observable<User> {
    return this.http.post<User>('admin/users', { body: { alias } });
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete(`admin/users/${id}`);
  }

  mergeUsers(placeholder: User, realUser: User): Observable<User> {
    return this.http.post<User>('admin/users/merge', {
      body: {
        placeholderID: placeholder.id,
        realID: realUser.id
      }
    });
  }
}
