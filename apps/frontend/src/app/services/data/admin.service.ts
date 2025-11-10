import { Injectable, inject } from '@angular/core';
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
  UpdateMap,
  Killswitches,
  AdminGetAdminActivitiesQuery,
  AdminActivity,
  AdminAnnouncement,
  CreateMapVersionWithFiles
} from '@momentum/constants';
import { HttpService } from './http.service';
import { HttpEvent } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpService);

  updateMap(mapID: number, body: UpdateMap): Observable<MMap> {
    return this.http.patch(`admin/maps/${mapID}`, { body });
  }

  submitMapVersion(
    mapID: number,
    { data, vmfs }: CreateMapVersionWithFiles
  ): Observable<HttpEvent<string>> {
    const formData = new FormData();

    formData.append('data', JSON.stringify(data));
    for (const vmf of vmfs ?? []) formData.append('vmfs', vmf, vmf.name);

    return this.http.post(`admin/maps/${mapID}`, {
      body: formData,
      reportProgress: true,
      observe: 'events'
    });
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

  resetUserAliasToSteamAlias(userID: number): Observable<void> {
    return this.http.patch(`admin/users/${userID}`, { body: { alias: '' } });
  }

  updateUserAvatarFromSteam(userID: number): Observable<void> {
    return this.http.patch(`admin/users/${userID}`, {
      body: { resetAvatar: true }
    });
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
        userID: realUser.id
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

  getAdminActivities(
    adminID?: number,
    query?: AdminGetAdminActivitiesQuery
  ): Observable<PagedResponse<AdminActivity>> {
    return this.http.get<PagedResponse<AdminActivity>>(
      'admin/activities' + (adminID ? `/${adminID}` : ''),
      { query }
    );
  }

  getKillswitches(): Observable<Killswitches> {
    return this.http.get('admin/killswitch');
  }

  updateKillswitches(killswitches: Killswitches): Observable<void> {
    return this.http.patch('admin/killswitch', { body: killswitches });
  }

  createAnnouncement(announcement: AdminAnnouncement): Observable<void> {
    return this.http.post('admin/announcement', { body: announcement });
  }
}
