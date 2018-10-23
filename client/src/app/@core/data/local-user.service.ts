import {Injectable} from '@angular/core';
import { AuthService } from './auth.service';
import {User} from './users.service';
import {Observable, ReplaySubject, Subject} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {UserProfile} from './profile.service';

export enum Permission {
  MAPPER = 1 << 0,
  MODERATOR = 1 << 1,
  ADMIN = 1 << 2,
  BANNED_LEADERBOARDS = 1 << 3,
  BANNED_ALIAS = 1 << 4,
  BANNED_AVATAR = 1 << 5,
}

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
    return this.http.get('/api/user/maps'); // TODO: ?expand=info?
  }
}
