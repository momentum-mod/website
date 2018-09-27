import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

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
export class UserService {

  private id: number;
  private displayName: string;
  private avatar: string;
  private permissions: number;

  constructor(private authService: AuthService) {
    const userInfo = this.authService.getAccessTokenPayload();
    if (userInfo !== null) {
      this.id = userInfo.id;
      this.displayName = userInfo.displayName;
      this.avatar = userInfo.avatar;
      this.permissions = userInfo.permissions;
    }
  }

  public getInfo() {
    return {
      id: this.id,
      displayName: this.displayName,
      avatar: this.avatar,
      permissions: this.permissions,
    };
  }

  public isLoggedIn() {
    return this.authService.isAuthenticated();
  }

  public hasPermission(permission: Permission) {
    return permission & this.permissions;
  }

}
