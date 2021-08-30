// Operators/Node Modules
import { Injectable } from '@angular/core';
import {CookieService} from 'ngx-cookie-service';

// Services
import { LocalUserService } from './local-user.service';
import {AuthService} from '../auth.service';

// Models
import {User} from '../../models/user.model';
import {Role} from '../../models/role.model';
import {Ban} from '../../models/ban.model';
import {UserFollowObject} from '../../models/follow.model';
import {FollowStatus} from '../../models/follow-status.model';
import {MapFavorites} from '../../models/map-favorites.model';
import {MapLibrary} from '../../models/map-library.model';
import {MapFavorite} from '../../models/map-favorite.model';
import {MomentumMaps} from '../../models/momentum-maps.model';
import {MapSubmissionSummaryElement} from '../../models/map-submission-summary-element.model';
import {UserCredits} from '../../models/user-credits.model';
import {MapNotify} from '../../models/map-notify.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable()
export class LocalUserStoreService {

  constructor(
    private authService: AuthService,
    private cookieService: CookieService,
    private localUserService: LocalUserService,
  ) {
    const userCookieExists = this.cookieService.check('user');
    if (userCookieExists) {
      const userCookie = decodeURIComponent(this.cookieService.get('user'));
      localStorage.setItem('user', userCookie);
      this.cookieService.delete('user', '/');
    }
    const user = localStorage.getItem('user');
    if (user) {
      this.localUser = JSON.parse(user);
      this.refreshLocal();
    }
  }

  // current local user
  private _localUser: BehaviorSubject<User> = new BehaviorSubject(null);
  public readonly localUser$: Observable<User> = this._localUser.asObservable();

  set localUser(newUser: User) {
    this._localUser.next(newUser);
  }

  get localUser() {
    return this._localUser.value;
  }

  public async refreshLocal(): Promise<void> {
    this.localUser = await this.localUserService.getLocalUser({
      params: { expand: 'profile' },
    }).toPromise();
  }

  public isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  public logout() {
    this.authService.logout();
  }

  public hasRole(role: number|Role, user: User = this.localUser): boolean {
    return user ? (role & user.roles) !== 0 : false;
  }

  public hasBan(ban: number|Ban, user: User = this.localUser): boolean {
    return user ? (ban & user.bans) !== 0 : false;
  }

   /**
   * @param options The options for the request
   * @return specific user's profile
   */
    public getLocalUser(options?: object): Observable<User> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     *
     * @param user User with new values of properties
     * @return response
     */
    public updateUser(user: User): Observable<any> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param options The options for the request
     * @return a list of map library entries
     */
    public getMapLibrary(options?: object): Observable<MapLibrary> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param mapID ID of a specific map
     * @return adds map to user library
     */
    public addMapToLibrary(mapID: number): Observable<any> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param mapID ID of a specific map
     * @return remove map from user library
     */
    public removeMapFromLibrary(mapID: number): Observable<any> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param mapID ID of a specific map
     * @return the added map in library
     */
    public isMapInLibrary(mapID: number): Observable<any> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param options The options for the request
     * @return a list of map favorites
     */
    public getMapFavorites(options?: object): Observable<MapFavorites> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param mapID ID of a specific map
     * @return a map favorite
     */
    public getMapFavorite(mapID: number): Observable<MapFavorite> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param mapID
     */
    public addMapToFavorites(mapID: number): Observable<any> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param mapID
     */
    public removeMapFromFavorites(mapID: number): Observable<any> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param options An object of options
     * @return A list of credits featuring the local user
     */
    public getMapCredits(options?: object): Observable<UserCredits> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param options
     * @return retrieve all submitted maps
     */
    public getSubmittedMaps(options?: object): Observable<MomentumMaps> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @return retrieve summary of the user's submitted maps
     */
    public getSubmittedMapSummary(): Observable<MapSubmissionSummaryElement[]> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param user The user to check the follow status of
     * @return A json object with two booleans determining follow relationship
     */
    public checkFollowStatus(user: User): Observable<FollowStatus> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param user specific user's profile
     * @return update user following
     */
    public followUser(user: User): Observable<UserFollowObject> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param user Specific user's profile
     * @param notifyOn The flags to notify the followee on
     * @return update the following status on the user's profile
     */
    public updateFollowStatus(user: User, notifyOn: number): Observable<any> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param user specific user's profile
     * @return user us unfollowed
     */
    public unfollowUser(user: User): Observable<any> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
    * @param mapID The map to check if notifications are enabled
    * @return A json object with the potential map and the activity type for notificaions
    */
    public checkMapNotify(mapID: number): Observable<MapNotify> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param mapID The map to create or update notifications for
     * @param notifyOn The flags to notify the followee on
     * @return update the map notification status on the user's profile
     */
    public updateMapNotify(mapID: number, notifyOn: number): Observable<any> {
      throw new Error('NOT IMPLMENTED');
    }

    /**
     * @param mapID The map to disable notificaions for
     * @return Notifications disabled for map
     */
    public disableMapNotify(mapID: number): Observable<any> {
      throw new Error('NOT IMPLMENTED');
    }

    public resetAliasToSteamAlias(): Observable<any> {
      throw new Error('NOT IMPLMENTED');
    }
}
