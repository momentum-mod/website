import {Injectable} from '@angular/core';
import { AuthService } from './auth.service';
import {Observable, ReplaySubject, Subject} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {UserProfile} from '../models/profile.model';
import {User} from '../models/user.model';
import {Permission} from '../models/permissions.model';
import {UserFollowObject} from '../models/follow.model';
import {FollowStatus} from '../models/follow-status.model';

@Injectable({
  providedIn: 'root',
})
export class LocalUserService {

  private localUser: User;
  private locUserObtEmit: Subject<User>;

  constructor(private authService: AuthService,
              private http: HttpClient) {
    this.locUserObtEmit = new ReplaySubject<User>(1);
    this.refreshLocal();
  }

  public refreshLocal(): void {
    this.localUser = null;
    this.getLocalUser().subscribe(usr => {
      this.locUserObtEmit.next(usr);
      this.localUser = usr;
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

  public hasPermission(permission: Permission, user: User = this.localUser): boolean {
    return user ? (permission & user.permissions) === permission : false;
  }

  /**
   * @return specific user's profile
   */
  public getLocalUser(): Observable<any> {
    return this.http.get('/api/user?expand=profile');
  }

  /**
   *
   * @param profile Profile with new values of properties
   * @return updated specific user's profile
   */
  public updateProfile(profile: UserProfile): Observable<any> {
    return this.http.patch('/api/user/profile', profile);
  }

  public getMapLibrary(): Observable<any> {
/*    return of({
      maps: [
        {
          id: '123',
          name: 'testmap1',
          statusFlag: 0,
          createdAt: new Date(),
          info: {
            id: '1234',
            totalDownloads: '123',
            avatarURL: '',
            description: 'This is a testmap1',
            numBonuses: 0,
            numCheckpoints: 2,
            numStages: 3,
            difficulty: 4,
          },
          credits: [
            {
              id: '1234',
              type: 0,
              user: {
                id: '1234',
                permissions: 0,
                profile: {
                  id: '244',
                  alias: 'Mapperooni',
                  avatarURL: '',
                  bio: 'Testy',
                },
              },
            },
          ],
          /!*          leaderboardID?: string;
		  download?: string;*!/
        },
      ],
    });*/
    return this.http.get('/api/user/maps/library');
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
   * @return retrieve all submitted maps
   */
  public getSubmittedMaps(): Observable<any> {
    return this.http.get('/api/user/maps/submitted?expand=info,credits');
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
