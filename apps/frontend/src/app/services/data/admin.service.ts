import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import {
  AdminGetReportsQuery,
  AdminUpdateUser,
  MapsGetAllAdminQuery,
  MMap,
  Report,
  UpdateReport,
  User,
  PagedResponse,
  MapReview,
  AdminUpdateMapReview,
  UpdateMapAdmin,
  Killswitches
} from '@momentum/constants';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpService) {}

  updateMap(mapID: number, body: UpdateMapAdmin): Observable<MMap> {
    return this.http.patch(`admin/maps/${mapID}`, { body });
  }

  getMaps(query: MapsGetAllAdminQuery): Observable<PagedResponse<MMap>> {
    return this.http.get<PagedResponse<MMap>>('admin/maps', { query });
  }

  deleteMap(mapID: number): Observable<void> {
    return this.http.delete(`admin/maps/${mapID}`);
  }

  updateUser(userID: number, body: AdminUpdateUser): Observable<void> {
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

  updateMapReview(
    reviewID: number,
    resolved: boolean | null
  ): Observable<MapReview> {
    return this.http.patch<MapReview>(`admin/map-review/${reviewID}`, {
      body: { resolved } as AdminUpdateMapReview
    });
  }

  deleteMapReview(reviewID: number): Observable<void> {
    return this.http.delete(`admin/map-review/${reviewID}`);
  }

  getKillswitches(): Observable<Killswitches> {
    return this.http.get('admin/killswitch');
  }

  updateKillswitches(killswitches: Killswitches): Observable<void> {
    return this.http.patch('admin/killswitch', { body: killswitches });
  }
}
