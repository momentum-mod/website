import {Injectable} from '@angular/core';
import {AuthService} from './auth.service';
import {Observable, ReplaySubject, Subject} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {User} from '../models/user.model';
import {Role} from '../models/role.model';
import {Ban} from '../models/ban.model';
import {UserFollowObject} from '../models/follow.model';
import {FollowStatus} from '../models/follow-status.model';
import {CookieService} from 'ngx-cookie-service';
import {MapFavorites} from '../models/map-favorites.model';
import {MapLibrary} from '../models/map-library.model';
import {MapFavorite} from '../models/map-favorite.model';
import {MomentumMaps} from '../models/momentum-maps.model';
import {MapSubmissionSummaryElement} from '../models/map-submission-summary-element.model';
import {UserCredits} from '../models/user-credits.model';
import {MapNotify} from '../models/map-notify.model';
import {environment} from '../../../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class LocalUserService {

  public localUser: User;
  private locUserObtEmit: Subject<User>;

  constructor(private authService: AuthService,
              private cookieService: CookieService,
              private http: HttpClient) {
    this.locUserObtEmit = new ReplaySubject<User>(1);
    const userCookieExists = this.cookieService.check('user');
    if (userCookieExists) {
      const userCookie = decodeURIComponent(this.cookieService.get('user'));
      localStorage.setItem('user', userCookie);
      this.cookieService.delete('user', '/');
    }
    const user = localStorage.getItem('user');
    if (user) {
      this.localUser = JSON.parse(user);
      this.locUserObtEmit.next(this.localUser);
      this.refreshLocal();
    }
  }

  public refreshLocal(): void {
    this.getLocalUser({
      params: { expand: 'profile' },
    }).subscribe(usr => {
      this.locUserObtEmit.next(usr);
      this.localUser = usr;
      localStorage.setItem('user', JSON.stringify(usr));
    });
  }

  public getLocal(): Observable<User> {
    return this.locUserObtEmit.asObservable();
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
    return this.http.get<User>(environment.api + '/api/user', options || {});
  }

  /**
   *
   * @param user User with new values of properties
   * @return response
   */
  public updateUser(user: User): Observable<any> {
    return this.http.patch(environment.api + '/api/user', user);
  }

  /**
   * @param options The options for the request
   * @return a list of map library entries
   */
  public getMapLibrary(options?: object): Observable<MapLibrary> {
    return this.http.get<MapLibrary>(environment.api + '/api/user/maps/library', options || {});
  }

  /**
   * @param mapID ID of a specific map
   * @return adds map to user library
   */
  public addMapToLibrary(mapID: number): Observable<any> {
    return this.http.put(environment.api + '/api/user/maps/library/' + mapID, {});
  }

  /**
   * @param mapID ID of a specific map
   * @return remove map from user library
   */
  public removeMapFromLibrary(mapID: number): Observable<any> {
    return this.http.delete(environment.api + '/api/user/maps/library/' + mapID);
  }

  /**
   * @param mapID ID of a specific map
   * @return the added map in library
   */
  public isMapInLibrary(mapID: number): Observable<any> {
    return this.http.get(environment.api + '/api/user/maps/library/' + mapID);
  }

  /**
   * @param options The options for the request
   * @return a list of map favorites
   */
  public getMapFavorites(options?: object): Observable<MapFavorites> {
    return this.http.get<MapFavorites>(environment.api + '/api/user/maps/favorites', options || {});
  }

  /**
   * @param mapID ID of a specific map
   * @return a map favorite
   */
  public getMapFavorite(mapID: number): Observable<MapFavorite> {
    return this.http.get<MapFavorite>(environment.api + '/api/user/maps/favorites/' + mapID);
  }

  /**
   * @param mapID
   */
  public addMapToFavorites(mapID: number): Observable<any> {
    return this.http.put(environment.api + '/api/user/maps/favorites/' + mapID, {});
  }

  /**
   * @param mapID
   */
  public removeMapFromFavorites(mapID: number): Observable<any> {
    return this.http.delete(environment.api + '/api/user/maps/favorites/' + mapID);
  }

  /**
   * @param options An object of options
   * @return A list of credits featuring the local user
   */
  public getMapCredits(options?: object): Observable<UserCredits> {
    return this.http.get<UserCredits>(environment.api + '/api/user/maps/credits', options || {});
  }

  /**
   * @param options
   * @return retrieve all submitted maps
   */
  public getSubmittedMaps(options?: object): Observable<MomentumMaps> {
    return this.http.get<MomentumMaps>(environment.api + '/api/user/maps/submitted', options || {});
  }

  /**
   * @return retrieve summary of the user's submitted maps
   */
  public getSubmittedMapSummary(): Observable<MapSubmissionSummaryElement[]> {
    return this.http.get<MapSubmissionSummaryElement[]>(environment.api + '/api/user/maps/submitted/summary');
  }

  /**
   * @param user The user to check the follow status of
   * @return A json object with two booleans determining follow relationship
   */
  public checkFollowStatus(user: User): Observable<FollowStatus> {
    return this.http.get<FollowStatus>(environment.api + '/api/user/follow/' + user.id);
  }

  /**
   * @param user specific user's profile
   * @return update user following
   */
  public followUser(user: User): Observable<UserFollowObject> {
    return this.http.post<UserFollowObject>(environment.api + '/api/user/follow', {userID: user.id});
  }

  /**
   * @param user Specific user's profile
   * @param notifyOn The flags to notify the followee on
   * @return update the following status on the user's profile
   */
  public updateFollowStatus(user: User, notifyOn: number): Observable<any> {
    return this.http.patch(environment.api + '/api/user/follow/' + user.id, {
      notifyOn: notifyOn,
    });
  }

  /**
   * @param user specific user's profile
   * @return user us unfollowed
   */
  public unfollowUser(user: User): Observable<any> {
    return this.http.delete(environment.api + '/api/user/follow/' + user.id, {
      responseType: 'text',
    });
  }

  /**
  * @param mapID The map to check if notifications are enabled
  * @return A json object with the potential map and the activity type for notifications
  */
  public checkMapNotify(mapID: number): Observable<MapNotify> {
    return this.http.get<MapNotify>(environment.api + '/api/user/notifyMap/' + mapID);
  }

  /**
   * @param mapID The map to create or update notifications for
   * @param notifyOn The flags to notify the followee on
   * @return update the map notification status on the user's profile
   */
  public updateMapNotify(mapID: number, notifyOn: number): Observable<any> {
    return this.http.put(environment.api + '/api/user/notifyMap/' + mapID, {
      notifyOn: notifyOn,
    });
  }

  /**
   * @param mapID The map to disable notifications for
   * @return Notifications disabled for map
   */
  public disableMapNotify(mapID: number): Observable<any> {
    return this.http.delete(environment.api + '/api/user/notifyMap/' + mapID, {
      responseType: 'text',
    });
  }

  public resetAliasToSteamAlias(): Observable<any> {
    return this.http.patch(environment.api + '/api/user', {
      alias: '',
    });
  }

}
