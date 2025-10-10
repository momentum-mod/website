import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable, of } from 'rxjs';
import { DialogService } from 'primeng/dynamicdialog';
import {
  Ban,
  CombinedRoles,
  Follow,
  FollowStatus,
  MapCredit,
  MapCreditsGetQuery,
  MapFavorite,
  MapNotify,
  MapsGetAllUserSubmissionQuery,
  MapSummary,
  MMap,
  PagedResponse,
  Profile,
  Role,
  TOS_VERSION,
  UpdateUser,
  User,
  UserMapFavoritesGetQuery,
  UsersGetQuery,
  UserStats
} from '@momentum/constants';
import * as Bitflags from '@momentum/bitflags';
import { AuthService } from './auth.service';
import { HttpService } from './http.service';
import { env } from '../../env/environment';
import { POST_AUTH_REDIRECT_KEY } from '../../guards/redirect.guard';
import { TosDialogComponent } from '../../components/dialogs/tos-dialog.component';

export type FullUser = User & { profile?: Profile; userStats?: UserStats };

@Injectable({ providedIn: 'root' })
export class LocalUserService {
  private authService = inject(AuthService);
  private http = inject(HttpService);
  private dialogService = inject(DialogService);

  constructor() {
    const storedUser =
      this.isLoggedIn && localStorage.getItem('user')
        ? (JSON.parse(localStorage.getItem('user') as string) as FullUser)
        : null;

    this.user = new BehaviorSubject(storedUser);
    this.refreshLocalUser();
  }

  public readonly user: BehaviorSubject<FullUser | null>;

  public get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  public refreshLocalUser(): void {
    if (this.isLoggedIn)
      this.fetchLocalUser({ expand: ['profile', 'userStats'] }).subscribe(
        (user) => {
          this.user.next(user as FullUser);
          localStorage.setItem('user', JSON.stringify(user));
        }
      );
  }

  public async login() {
    const acceptedTos = +localStorage.getItem('tos');
    if (!acceptedTos || acceptedTos < TOS_VERSION) {
      const isFirstTime = !acceptedTos;
      const res = await firstValueFrom(
        this.dialogService.open(TosDialogComponent, {
          header: isFirstTime
            ? 'Momentum Mod Account Creation'
            : 'Momentum Mod Legal Update',
          data: {
            isFirstTime
          }
        }).onClose
      );
      if (!res) return;
    }

    sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, window.location.pathname);
    window.location.href = env.auth + '/web';
  }

  public logout() {
    this.authService.logout();
    this.user.next(null);
    localStorage.removeItem('user');
  }

  public hasRole(roles: Role, user?: User): boolean {
    if (!user && !this.isLoggedIn) return false;
    user ??= this.user.value as User;
    return user?.roles ? Bitflags.has(roles, user.roles) : false;
  }

  public get isMod() {
    return this.hasRole(Role.MODERATOR);
  }

  public get isAdmin() {
    return this.hasRole(Role.ADMIN);
  }

  public get isModOrAdmin() {
    return this.hasRole(CombinedRoles.MOD_OR_ADMIN);
  }

  public get isReviewerOrAbove() {
    return this.hasRole(CombinedRoles.REVIEWER_AND_ABOVE);
  }

  public get isLimited() {
    return this.hasRole(Role.LIMITED);
  }

  public hasBan(bans: Ban, user?: User): boolean {
    if (!user && !this.isLoggedIn) return false;
    user ??= this.user.value as User;
    return user?.bans ? Bitflags.has(bans, user.bans) : false;
  }

  private fetchLocalUser(query?: UsersGetQuery): Observable<User> {
    return this.http.get<User>('user', { query });
  }

  public updateUser(body: UpdateUser): Observable<void> {
    return this.http.patch('user', { body });
  }

  public deleteUser(): Observable<void> {
    return this.http.delete('user');
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
    return this.http.get<PagedResponse<MMap>>('user/maps', { query });
  }

  public getSubmittedMapSummary(): Observable<MapSummary[]> {
    return this.http.get<MapSummary[]>('user/maps/summary');
  }

  public checkFollowStatus(user: User): Observable<FollowStatus> {
    return this.http.get<FollowStatus>(`user/follow/${user.id}`);
  }

  public followUser(user: User): Observable<Follow> {
    return this.http.post<Follow>(`user/follow/${user.id}`);
  }

  public followUsers(userIDs: Set<number>): Observable<Follow[]> {
    return this.http.post<Follow[]>('user/follow', {
      body: { targetUserIDs: [...userIDs] }
    });
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

  public updateAvatarFromSteam(): Observable<void> {
    return this.http.patch('user', { body: { resetAvatar: true } });
  }

  public getSteamFriends(): Observable<User[]> {
    return this.http.get<User[]>('user/steamfriends');
  }
}
