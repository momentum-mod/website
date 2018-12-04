import {Injectable} from '@angular/core';
import { AuthService } from './auth.service';
import {Observable, ReplaySubject, Subject} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {UserProfile} from '../models/profile.model';
import {User} from '../models/user.model';
import {Permission} from '../models/permissions.model';
import {UserFollowObject} from '../models/follow.model';
import {FollowStatus} from '../models/follow-status.model';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root',
})
export class LocalUserService {

  private localUser: User;
  private locUserObtEmit: Subject<User>;

  constructor(private authService: AuthService,
              private cookieService: CookieService,
              private http: HttpClient) {
    this.locUserObtEmit = new ReplaySubject<User>(1);
    const userCookieExists = this.cookieService.check('user');
    if (userCookieExists) {
      const userCookie = decodeURIComponent(this.cookieService.get('user'));
      localStorage.setItem('user', userCookie);
      this.cookieService.delete('user');
    }
    const user = localStorage.getItem('user');
    if (user) {
      this.localUser = JSON.parse(localStorage.getItem('user'));
      this.locUserObtEmit.next(this.localUser);
    }
  }

  public refreshLocal(): void {
    this.localUser = null;
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

  public hasPermission(permission: number|Permission, user: User = this.localUser): boolean {
    return user ? (permission & user.permissions) !== 0 : false;
  }

  /**
   * @param options The options for the request
   * @return specific user's profile
   */
  public getLocalUser(options?: object): Observable<any> {
    return this.http.get('/api/user', options || {});
  }

  /**
   *
   * @param profile Profile with new values of properties
   * @return updated specific user's profile
   */
  public updateProfile(profile: UserProfile): Observable<any> {
    return this.http.patch('/api/user/profile', profile);
  }

  public getMapLibrary(options?: object): Observable<any> {
    return this.http.get('/api/user/maps/library', options || {});
  }

  /**
   * @param mapID ID of a specific map
   * @return adds map to user library
   */
  public addMapToLibrary(mapID: string): Observable<any> {
    return this.http.post('/api/user/maps/library', {mapID: mapID});
  }

  /**
   * @param mapID ID of a specific map
   * @return remove map from user library
   */
  public removeMapFromLibrary(mapID: string): Observable<any> {
    return this.http.delete('/api/user/maps/library/' + mapID, {
      responseType: 'text',
    });
  }

  /**
   * @param mapID ID of a specific map
   * @return the added map in library
   */
  public isMapInLibrary(mapID: number): Observable<any> {
    return this.http.get('/api/user/maps/library/' + mapID);
  }

  /**
   * @param options
   * @return retrieve all submitted maps
   */
  public getSubmittedMaps(options?: object): Observable<any> {
    return this.http.get('/api/user/maps/submitted', options || {});
  }

  /**
   * @return retrieve summary of the user's submitted maps
   */
  public getSubmittedMapSummary(): Observable<any> {
    return this.http.get('/api/user/maps/submitted/summary');
  }

  /**
   * @param user The user to check the follow status of
   * @return A json object with two booleans determining follow relationship
   */
  public checkFollowStatus(user: User): Observable<FollowStatus> {
    return this.http.get<FollowStatus>('/api/user/follow/' + user.id);
  }

  /**
   * @param user specific user's profile
   * @return update user following
   */
  public followUser(user: User): Observable<UserFollowObject> {
    return this.http.post<UserFollowObject>('/api/user/follow', {userID: user.id});
  }

  /**
   * @param user Specific user's profile
   * @param notifyOn The flags to notify the followee on
   * @return update the following status on the user's profile
   */
  public updateFollowStatus(user: User, notifyOn: number): Observable<any> {
    return this.http.patch('/api/user/follow/' + user.id, {
      notifyOn: notifyOn,
    });
  }

  /**
   * @param user specific user's profile
   * @return user us unfollowed
   */
  public unfollowUser(user: User): Observable<any> {
    return this.http.delete('/api/user/follow/' + user.id, {
      responseType: 'text',
    });
  }
}
