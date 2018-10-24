import {Injectable} from '@angular/core';
import { AuthService } from './auth.service';
import {Observable, ReplaySubject, Subject} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {UserProfile} from '../models/profile.model';
import {User} from '../models/user.model';
import {Permission} from '../models/permissions.model';

@Injectable({
  providedIn: 'root',
})
export class LocalUserService {

  private localUser: User;
  private locUserObtEmit: Subject<User>;

  constructor(private authService: AuthService,
              private http: HttpClient) {
    this.locUserObtEmit = new ReplaySubject<User>();
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

  public getLocalUser(): Observable<any> {
    return this.http.get('/api/user?expand=profile');
  }

  public updateProfile(profile: UserProfile): Observable<any> {
    return this.http.patch('/api/user/profile', profile);
  }

  public getLocalUserMaps(): Observable<any> {
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
    return this.http.get('/api/user/maps?expand=info,credits');
  }
}
