import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Observable, of, ReplaySubject, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import { env } from '@momentum/frontend/env';
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
  QueryParam,
  Roles,
  UpdateUser,
  User,
  UserMapFavoritesGetQuery,
  UserMapLibraryGetQuery,
  UserMapSubmittedGetQuery,
  UsersGetQuery
} from '@momentum/types';
import { Role } from '@momentum/constants';
import { PagedResponse } from '@momentum/types';

// TODO: The roles and bans stuff needs changing, either we go back to bitflags
// (that's my current inclination), or this class needs refactoring to use
// the separate Bans and Roles objects.
@Injectable({ providedIn: 'root' })
export class LocalUserService {
  public localUser: User & { roles: Roles };
  private localUserSubject: Subject<User>;

  constructor(
    private authService: AuthService,
    private cookieService: CookieService,
    private http: HttpClient
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
    this.getLocalUser({ expand: ['profile'] }).subscribe((usr) => {
      this.localUserSubject.next(usr);
      this.localUser = usr as any;
      // this.localUser = usr as User;
      localStorage.setItem('user', JSON.stringify(usr));
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

  public hasRole(
    role: Role,
    user: User & { roles: Roles } = this.localUser
  ): boolean {
    return true; // TODO: Think we want to go back to bitflags, so this approach
    // is okay, don't want to do that backend refactor yet though.
    // return user ? (role & user.roles) !== 0 : false;
  }

  public hasBan(ban: any, user: User = this.localUser): boolean {
    //public hasBan(ban: number | Ban, user: User = this.localUser): boolean {
    return false;
    // return user ? (ban & user.bans) !== 0 : false;
  }

  public getLocalUser(query?: UsersGetQuery): Observable<User> {
    return this.http.get<User>(env.api + '/user', {
      params: query as QueryParam
    });
  }

  public updateUser(user: UpdateUser): Observable<any> {
    return this.http.patch(env.api + '/user', user);
  }

  public getMapLibrary(
    query?: UserMapLibraryGetQuery
  ): Observable<PagedResponse<MapLibraryEntry>> {
    return this.http.get<PagedResponse<MapLibraryEntry>>(
      env.api + '/user/maps/library',
      { params: query as QueryParam }
    );
  }

  public addMapToLibrary(mapID: number): Observable<any> {
    return this.http.put(env.api + '/user/maps/library/' + mapID, {});
  }

  public removeMapFromLibrary(mapID: number): Observable<any> {
    return this.http.delete(env.api + '/user/maps/library/' + mapID);
  }

  public isMapInLibrary(mapID: number): Observable<any> {
    return this.http.get(env.api + '/user/maps/library/' + mapID);
  }

  public getMapFavorites(
    query?: UserMapFavoritesGetQuery
  ): Observable<PagedResponse<MapFavorite>> {
    return this.http.get<PagedResponse<MapFavorite>>(
      env.api + '/user/maps/favorites',
      {
        params: query as QueryParam
      }
    );
  }

  public getMapFavorite(mapID: number): Observable<MapFavorite> {
    return this.http.get<MapFavorite>(
      env.api + '/user/maps/favorites/' + mapID
    );
  }

  public addMapToFavorites(mapID: number): Observable<any> {
    return this.http.put(env.api + '/user/maps/favorites/' + mapID, {});
  }

  public removeMapFromFavorites(mapID: number): Observable<any> {
    return this.http.delete(env.api + '/user/maps/favorites/' + mapID);
  }

  public getMapCredits(
    query?: Omit<MapCreditsGetQuery, 'userID'>
  ): Observable<PagedResponse<MapCredit>> {
    // TODO!!
    return of(undefined as any);
    // return this.http.get<Paged<MapCredit>>(
    //   env.api + '/user/maps/credits',
    //   options || {}
    // );
  }

  public getSubmittedMaps(
    query?: UserMapSubmittedGetQuery
  ): Observable<PagedResponse<Map>> {
    return this.http.get<PagedResponse<Map>>(env.api + '/user/maps/submitted', {
      params: query as QueryParam
    });
  }

  public getSubmittedMapSummary(): Observable<MapSummary[]> {
    return this.http.get<MapSummary[]>(
      env.api + '/user/maps/submitted/summary'
    );
  }

  public checkFollowStatus(user: User): Observable<FollowStatus> {
    return this.http.get<FollowStatus>(env.api + '/user/follow/' + user.id);
  }

  public followUser(user: User): Observable<Follow> {
    return this.http.post<Follow>(env.api + '/user/follow', {
      userID: user.id
    });
  }

  public updateFollowStatus(user: User, notifyOn: number): Observable<any> {
    return this.http.patch(env.api + '/user/follow/' + user.id, { notifyOn });
  }

  public unfollowUser(user: User): Observable<any> {
    return this.http.delete(env.api + '/user/follow/' + user.id, {
      responseType: 'text'
    });
  }

  public checkMapNotify(mapID: number): Observable<MapNotify> {
    return this.http.get<MapNotify>(env.api + '/user/notifyMap/' + mapID);
  }

  public updateMapNotify(mapID: number, notifyOn: number): Observable<any> {
    return this.http.put(env.api + '/user/notifyMap/' + mapID, { notifyOn });
  }

  public disableMapNotify(mapID: number): Observable<any> {
    return this.http.delete(env.api + '/user/notifyMap/' + mapID, {});
  }

  public resetAliasToSteamAlias(): Observable<any> {
    return this.http.patch(env.api + '/user', { alias: '' });
  }
}
