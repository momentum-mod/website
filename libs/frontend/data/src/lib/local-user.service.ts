import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Observable, of, ReplaySubject, Subject } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import {
  Follow,
  FollowStatus,
  Map,
  MapCredit,
  MapCreditsGetQuery,
  MapFavorite,
  MapLibraryEntry,
  MapNotify,
  MapSummary,
  Notification,
  UpdateNotification,
  UpdateUser,
  User,
  UserMapFavoritesGetQuery,
  UserMapLibraryGetQuery,
  UserMapSubmittedGetQuery,
  UsersGetQuery
} from '@momentum/types';
import { Ban, Role } from '@momentum/constants';
import { PagedResponse } from '@momentum/types';
import { Bitflags } from '@momentum/bitflags';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class LocalUserService {
  public localUser: User;
  private localUserSubject: Subject<User>;

  constructor(
    private authService: AuthService,
    private cookieService: CookieService,
    private http: HttpService
  ) {
    this.localUserSubject = new ReplaySubject<User>(1);
    const userCookieExists = this.cookieService.check('user');
    if (userCookieExists) {
      const userCookie = decodeURIComponent(this.cookieService.get('user'));
      localStorage.setItem('user', userCookie);
      this.cookieService.delete('user', '/');
    }
    const user = localStorage.getItem('user') as string;

    // TODO: Handle this properly - redirect to login?
    // if (!user) throw new Error('fuck');

    this.localUser = JSON.parse(user);
    this.localUserSubject.next(this.localUser);
    this.refreshLocal();
  }

  public refreshLocal(): void {
    this.getLocalUser({ expand: ['profile'] }).subscribe((user) => {
      this.localUserSubject.next(user);
      this.localUser = user as User;
      localStorage.setItem('user', JSON.stringify(user));
    });
  }

  public getLocal(): Observable<User> {
    return this.localUserSubject.asObservable();
  }

  public isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  public logout() {
    this.authService.logout();
  }

  public hasRole(role: Role, user: User = this.localUser): boolean {
    return user.roles ? Bitflags.has(user.roles, role) : false;
  }

  public hasBan(ban: Ban, user: User = this.localUser): boolean {
    return user.bans ? Bitflags.has(user.bans, ban) : false;
  }

  public getLocalUser(query?: UsersGetQuery): Observable<User> {
    return this.http.get<User>('user', { query });
  }

  public updateUser(body: UpdateUser): Observable<void> {
    return this.http.patch('user', { body });
  }

  public deleteUser(): Observable<void> {
    return this.http.delete('user');
  }

  public getMapLibrary(
    query?: UserMapLibraryGetQuery
  ): Observable<PagedResponse<MapLibraryEntry>> {
    return this.http.get<PagedResponse<MapLibraryEntry>>('user/maps/library', {
      query
    });
  }

  public getNotifications(): Observable<PagedResponse<Notification>> {
    return this.http.get<PagedResponse<Notification>>('user/notifications');
  }

  public updateNotification(
    notifID: number,
    body: UpdateNotification
  ): Observable<void> {
    return this.http.patch(`user/notifications/${notifID}`, { body });
  }

  public deleteNotification(notifID: number): Observable<void> {
    return this.http.delete(`user/notifications/${notifID}`);
  }

  public addMapToLibrary(mapID: number): Observable<void> {
    return this.http.put(`user/maps/library/${mapID}`, {});
  }

  public removeMapFromLibrary(mapID: number): Observable<void> {
    return this.http.delete(`user/maps/library/${mapID}`);
  }

  public isMapInLibrary(mapID: number): Observable<Map> {
    return this.http.get<Map>(`user/maps/library/${mapID}`);
  }

  public getMapFavorites(
    query?: UserMapFavoritesGetQuery
  ): Observable<PagedResponse<MapFavorite>> {
    return this.http.get<PagedResponse<MapFavorite>>('user/maps/favorites', {
      query
    });
  }

  public getMapFavorite(mapID: number): Observable<MapFavorite> {
    return this.http.get<MapFavorite>(`user/maps/favorites/${mapID}`);
  }

  public addMapToFavorites(mapID: number): Observable<void> {
    return this.http.put(`user/maps/favorites/${mapID}`, {});
  }

  public removeMapFromFavorites(mapID: number): Observable<any> {
    return this.http.delete(`user/maps/favorites/${mapID}`);
  }

  public getMapCredits(
    _query?: Omit<MapCreditsGetQuery, 'userID'>
  ): Observable<PagedResponse<MapCredit>> {
    // TODO!!
    return of(undefined as any);
    // return this.http.get<Paged<MapCredit>>(
    // `user/maps/credits`,
    //   options || {}
    // );
  }

  public getSubmittedMaps(
    query?: UserMapSubmittedGetQuery
  ): Observable<PagedResponse<Map>> {
    return this.http.get<PagedResponse<Map>>('user/maps/submitted', { query });
  }

  public getSubmittedMapSummary(): Observable<MapSummary[]> {
    return this.http.get<MapSummary[]>('user/maps/submitted/summary');
  }

  public checkFollowStatus(user: User): Observable<FollowStatus> {
    return this.http.get<FollowStatus>(`user/follow/${user.id}`);
  }

  public followUser(user: User): Observable<Follow> {
    return this.http.post<Follow>(`user/follow/${user.id}`);
  }

  public updateFollowStatus(user: User, notifyOn: number): Observable<void> {
    return this.http.patch(`user/follow/${user.id}`, {
      body: { notifyOn }
    });
  }

  public unfollowUser(user: User): Observable<void> {
    return this.http.delete(`user/follow/${user.id}`);
  }

  public checkMapNotify(mapID: number): Observable<MapNotify> {
    return this.http.get<MapNotify>(`user/notifyMap/${mapID}`);
  }

  // TODO: Making this return a Obs<MapNotify> breaks everything.
  // wtf is newFLags??
  public updateMapNotify(mapID: number, notifyOn: number): Observable<any> {
    return this.http.put<MapNotify>(`user/notifyMap/${mapID}`, {
      body: notifyOn
    });
  }

  public disableMapNotify(mapID: number): Observable<void> {
    return this.http.delete(`user/notifyMap/${mapID}`);
  }

  public resetAliasToSteamAlias(): Observable<void> {
    return this.http.patch('user', { body: { alias: '' } });
  }
}
