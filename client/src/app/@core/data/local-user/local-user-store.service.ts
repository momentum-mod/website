// Operators/Node Modules
import { Injectable } from '@angular/core';
import {CookieService} from 'ngx-cookie-service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';

// Services
import { LocalUserService } from './local-user.service';
import {AuthService} from '../auth.service';

// Models
import {User} from '../../models/user.model';
import {Role} from '../../models/role.model';
import {Ban} from '../../models/ban.model';
import {UserFollowObject} from '../../models/follow.model';
import {FollowStatus} from '../../models/follow-status.model';
import { MapFavorites } from '../../models/map-favorites.model';
import {MapLibrary} from '../../models/map-library.model';
import {MapFavorite} from '../../models/map-favorite.model';
import {MomentumMaps} from '../../models/momentum-maps.model';
import {MapSubmissionSummaryElement} from '../../models/map-submission-summary-element.model';
import {UserCredits} from '../../models/user-credits.model';
import {MapNotify} from '../../models/map-notify.model';

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

  // user favorite maps
  private _favoriteMaps: BehaviorSubject<MapFavorites> = new BehaviorSubject(null);
  public readonly favoriteMaps$: Observable<MapFavorites> = this._favoriteMaps.asObservable();

  set favoriteMaps(newMaps: MapFavorites) {
    this._favoriteMaps.next(newMaps);
  }

  get favoriteMaps() {
    return this._favoriteMaps.value;
  }

  // user submitted maps
  private _submittedMaps: BehaviorSubject<MomentumMaps> = new BehaviorSubject(null);
  public readonly submittedMaps$: Observable<MomentumMaps> = this._submittedMaps.asObservable();

  set submittedMaps(newSubmitedMaps: MomentumMaps) {
    this._submittedMaps.next(newSubmitedMaps);
  }

  get submittedMaps() {
    return this._submittedMaps.value;
  }

  private _submittedMapsSummary: BehaviorSubject<MapSubmissionSummaryElement[]> =
    new BehaviorSubject(null);
  public readonly submittedMapsSummary$: Observable<MapSubmissionSummaryElement[]> =
    this._submittedMapsSummary.asObservable();

  set submittedMapsSummary(newSummary: MapSubmissionSummaryElement[]) {
    this._submittedMapsSummary.next(newSummary);
  }

  get submittedMapsSummary() {
    return this._submittedMapsSummary.value;
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
  public getLocalUser(options?: object): User {
    this.localUserService.getLocalUser(options).pipe(
      take(1),
      map((c: User) => {
        console.log(`LocalUserStoreService: Received user`);
        this.localUser = c;
      }),
    ).subscribe();
    return this.localUser;
  }

  /**
   *
   * @param user User with new values of properties
   * @return response
   */
  public updateUser(user: User) {
    // TODO: Type responce
    return this.localUserService.updateUser(user);
  }

  /**
   * @param options The options for the request
   * @return a list of map library entries
   */
  public getMapLibrary(options?: object): Observable<MapLibrary> {
    return this.localUserService.getMapLibrary(options);
  }

  /**
   * @param mapID ID of a specific map
   * @return adds map to user library
   */
  public addMapToLibrary(mapID: number): Observable<any> {
    // TODO: Type responce
    return this.localUserService.addMapToLibrary(mapID);
  }

  /**
   * @param mapID ID of a specific map
   * @return remove map from user library
   */
  public removeMapFromLibrary(mapID: number): Observable<any> {
    // TODO: Type responce
    return this.localUserService.removeMapFromLibrary(mapID);
  }

  /**
   * @param mapID ID of a specific map
   * @return the added map in library
   */
  public isMapInLibrary(mapID: number): Observable<any> {
    // TODO: Type responce
    return this.localUserService.isMapInLibrary(mapID);
  }

  /**
   * @param options The options for the request
   * @return a list of map favorites
   */
  public getMapFavorites(options?: object): MapFavorites {
    this.localUserService.getMapFavorites(options).pipe(
      take(1),
      map(c => {
        this.favoriteMaps = c;
      }),
    ).subscribe();

    return this.favoriteMaps; // This will always return null/last value due to timing dummy
  }

  /**
   * @description Tries to get a map favorite from the store, if it
   * is not in there, then queries the API for it and adds it to the store.
   * @param mapID ID of a specific map
   * @return a map favorite
   */
  public getMapFavorite(mapID: number): Observable<MapFavorite> {
    if(this.favoriteMaps.favorites.filter(c => c.id === mapID).length > 0){
      return of(this.favoriteMaps.favorites.filter(c => c.id === mapID)[0]);
    }

    let result: MapFavorite;
    this.localUserService.getMapFavorite(mapID).pipe(
      take(1),
      map(c => {
        // Doing this will polute the store
        this.favoriteMaps.count++;
        this.favoriteMaps.favorites.push(c);
        result = c;
      }),
    ).subscribe();
    return of(result);
  }

  /**
   * @param mapID
   */
  public addMapToFavorites(mapID: number): Observable<any> {
    const result = this.localUserService.addMapToFavorites(mapID);
    this.getMapFavorite(mapID);
    return result;
  }

  /**
   * @param mapID
   */
  public removeMapFromFavorites(mapID: number): Observable<any> {
    const result = this.localUserService.removeMapFromFavorites(mapID);
    const favIndex = this.favoriteMaps.favorites.findIndex((c => c.mapID === mapID));
    if (favIndex > -1) {
      this.favoriteMaps.favorites.splice(favIndex, 1);
      this.favoriteMaps.count--;
    } else {
      console.warn('Could not find map favorite in store.');
    }

    return result;
  }

  /**
   * @param options An object of options
   * @return A list of credits featuring the local user
   */
  public getMapCredits(options?: object): Observable<UserCredits> {
    return this.localUserService.getMapCredits(options);
  }

  /**
   * @param options
   * @return retrieve all submitted maps
   */
  public getSubmittedMaps(options?: object): MomentumMaps {
    this.localUserService.getSubmittedMaps(options).pipe(
      take(1),
      map(c => {
        this.submittedMaps = c;
      }),
    ).subscribe();

    return this.submittedMaps; // This will always return null/last value due to timing dummy
  }

  /**
   * @return retrieve summary of the user's submitted maps
   */
  public getSubmittedMapSummary(): Observable<MapSubmissionSummaryElement[]> {
    return this.localUserService.getSubmittedMapSummary();
  }

  /**
   * @param user The user to check the follow status of
   * @return A json object with two booleans determining follow relationship
   */
  public checkFollowStatus(user: User): Observable<FollowStatus> {
    return this.localUserService.checkFollowStatus(user);
  }

  /**
   * @param user specific user's profile
   * @return update user following
   */
  public followUser(user: User): Observable<UserFollowObject> {
    return this.localUserService.followUser(user);
  }

  /**
   * @param user Specific user's profile
   * @param notifyOn The flags to notify the followee on
   * @return update the following status on the user's profile
   */
  public updateFollowStatus(user: User, notifyOn: number): Observable<any> {
    return this.localUserService.updateFollowStatus(user, notifyOn);
  }

  /**
   * @param user specific user's profile
   * @return user us unfollowed
   */
  public unfollowUser(user: User): Observable<any> {
    return this.localUserService.unfollowUser(user);
  }

  /**
  * @param mapID The map to check if notifications are enabled
  * @return A json object with the potential map and the activity type for notificaions
  */
  public checkMapNotify(mapID: number): Observable<MapNotify> {
    return this.localUserService.checkMapNotify(mapID);
  }

  /**
   * @param mapID The map to create or update notifications for
   * @param notifyOn The flags to notify the followee on
   * @return update the map notification status on the user's profile
   */
  public updateMapNotify(mapID: number, notifyOn: number): Observable<any> {
    return this.localUserService.updateMapNotify(mapID, notifyOn);
  }

  /**
   * @param mapID The map to disable notificaions for
   * @return Notifications disabled for map
   */
  public disableMapNotify(mapID: number): Observable<any> {
    return this.localUserService.disableMapNotify(mapID);
  }

  public resetAliasToSteamAlias(): Observable<any> {
    return this.localUserService.resetAliasToSteamAlias();
  }
}
