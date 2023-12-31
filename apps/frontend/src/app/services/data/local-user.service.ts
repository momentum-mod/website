import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  Ban,
  Follow,
  FollowStatus,
  MapCredit,
  MapCreditsGetQuery,
  MapFavorite,
  MapLibraryEntry,
  MapNotify,
  MapsGetAllUserSubmissionQuery,
  MapSummary,
  MMap,
  Notification,
  PagedResponse,
  Profile,
  Role,
  UpdateNotification,
  UpdateUser,
  User,
  UserMapFavoritesGetQuery,
  UserMapLibraryGetQuery,
  UsersGetQuery,
  UserStats
} from '@momentum/constants';
import { Bitflags } from '@momentum/bitflags';
import { AuthService } from './auth.service';
import { HttpService } from './http.service';

export type FullUser = User & { profile?: Profile; userStats?: UserStats };

@Injectable({ providedIn: 'root' })
export class LocalUserService {
  public readonly localUserSubject: BehaviorSubject<FullUser | null>;

  constructor(
    private authService: AuthService,
    private http: HttpService
  ) {
    const storedUser =
      this.isLoggedIn() && localStorage.getItem('user')
        ? (JSON.parse(localStorage.getItem('user') as string) as FullUser)
        : null;

    this.localUserSubject = new BehaviorSubject(storedUser);
    this.refreshLocalUser();
  }

  public refreshLocalUser(): void {
    this.getLocalUser({ expand: ['profile', 'userStats'] }).subscribe(
      (user) => {
        this.localUserSubject.next(user as FullUser);
        localStorage.setItem('user', JSON.stringify(user));
      }
    );
  }

  public get localUser(): FullUser | null {
    return this.localUserSubject.getValue();
  }

  public isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  public logout() {
    this.authService.logout();
  }

  public hasRole(roles: Role, user?: User): boolean {
    if (!user && !this.isLoggedIn())
      throw new Error(
        'LocalUserService.hasRole: called with no logged in user'
      );
    user ??= this.localUser as User;
    return user.roles ? Bitflags.has(roles, user.roles) : false;
  }

  public hasBan(bans: Ban, user?: User): boolean {
    if (!user && !this.isLoggedIn())
      throw new Error(
        'LocalUserService.hasRole: called with no logged in user'
      );
    user ??= this.localUser as User;
    return user.roles ? Bitflags.has(bans, user.bans) : false;
  }

  private getLocalUser(query?: UsersGetQuery): Observable<User> {
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

  public isMapInLibrary(mapID: number): Observable<MMap> {
    return this.http.get<MMap>(`user/maps/library/${mapID}`);
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
    query?: MapsGetAllUserSubmissionQuery
  ): Observable<PagedResponse<MMap>> {
    return this.http.get<PagedResponse<MMap>>('user/maps/submitted', { query });
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
