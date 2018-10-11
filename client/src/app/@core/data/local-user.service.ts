import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import {User, UsersService} from './users.service';
import {Observable} from 'rxjs';

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
  private locUsr$: Observable<User>;

  constructor(private authService: AuthService,
              private usersService: UsersService) {
    this.refreshLocal();
  }

  public refreshLocal(): void {
    this.localUser = null;
    const userInfo = this.authService.getAccessTokenPayload();
    if (userInfo !== null) {
      this.locUsr$ = this.usersService.getUser(userInfo.id);
      this.locUsr$.subscribe(usr => {
        this.localUser = usr;
      });
    }
  }

  public getLocal(): Observable<User> {
    return this.locUsr$;
  }

  public isLoggedIn() {
    return this.authService.isAuthenticated();
  }

  public logout() {
    this.authService.logout();
  }

  public hasPermission(permission: Permission, user: User = this.localUser): boolean {
    return user ? (permission & user.permissions) === permission : false;
  }
}
