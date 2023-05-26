import { Component, OnDestroy, OnInit } from '@angular/core';
import { switchMap, takeUntil } from 'rxjs/operators';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { ReplaySubject, Subject } from 'rxjs';
import { NbToastrService } from '@nebular/theme';
import { Ban, ReportType, Role } from '@momentum/constants';
import { Follow, User } from '@momentum/types';
import { LocalUserService, UsersService } from '@momentum/frontend/data';

@Component({
  selector: 'mom-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private ngUnsub = new Subject<void>();
  protected readonly Role = Role;
  protected readonly ReportType = ReportType;
  userSubject: ReplaySubject<User>;
  // TODO: Removing types on this for now, add back once socials auth is done!
  user: any; // User;
  isLocal: boolean;
  isMapper: boolean;
  isVerified: boolean;
  isMod: boolean;
  isAdmin: boolean;
  avatarUrl: string;
  avatarLoaded: boolean;
  followingUsers: Follow[];
  followedByUsers: Follow[];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public userService: LocalUserService,
    private usersService: UsersService,
    private toastService: NbToastrService
  ) {
    this.ReportType = ReportType;
    this.isLocal = true;
    this.userSubject = new ReplaySubject<User>(1);
    this.isMapper = false;
    this.isMod = false;
    this.isAdmin = false;
    this.isVerified = false;
    this.followingUsers = [];
    this.followedByUsers = [];
    this.avatarUrl = '/assets/images/blank_avatar.jpg';
  }

  ngOnInit() {
    this.route.paramMap
      .pipe(
        switchMap((params: ParamMap) => {
          if (params.has('id')) {
            const idNum = Number(params.get('id'));
            this.userService
              .getLocal()
              .pipe(takeUntil(this.ngUnsub))
              .subscribe({
                next: (user) => (this.isLocal = idNum === user.id),
                error: (error) =>
                  this.toastService.danger(
                    error.message,
                    'Cannot get user profile'
                  )
              });
            return this.usersService.getUser(idNum, {
              expand: ['profile', 'stats']
            });
          } else {
            this.isLocal = true;
            return this.userService.getLocalUser({
              expand: ['profile', 'stats']
            });
          }
        })
      )
      .subscribe({
        next: (user) => {
          this.user = user;
          this.isMapper = this.hasRole(Role.MAPPER);
          this.isMod = this.hasRole(Role.MODERATOR);
          this.isAdmin = this.hasRole(Role.ADMIN);
          this.isVerified = this.hasRole(Role.VERIFIED);
          this.userSubject.next(user);
          if (!this.hasBan(Ban.AVATAR) && this.user.avatarURL)
            this.avatarUrl = this.user.avatarURL;

          this.avatarLoaded = true;
          this.usersService.getUserFollows(this.user).subscribe({
            next: (response) => (this.followingUsers = response.response),
            error: (error) =>
              this.toastService.danger(
                error.message,
                'Could not retrieve user follows'
              )
          });
          this.usersService.getFollowersOfUser(this.user).subscribe({
            next: (response) => (this.followedByUsers = response.response),
            error: (error) =>
              this.toastService.danger(
                error.message,
                'Could not retrieve user following'
              )
          });
        },
        error: (error) =>
          this.toastService.danger(error.message, 'Cannot get user details')
      });
  }

  ngOnDestroy(): void {
    this.ngUnsub.next();
    this.ngUnsub.complete();
  }

  hasRole(role: Role) {
    if (!this.user) return false;
    return this.userService.hasRole(role, this.user);
  }

  hasBan(ban: Ban) {
    if (!this.user) return false;
    return this.userService.hasBan(ban, this.user);
  }

  onEditProfile() {
    this.router.navigate([
      `/dashboard/profile/${this.isLocal ? '' : this.user.id + '/'}edit`
    ]);
  }

  canEdit(): boolean {
    return (
      this.isLocal || this.userService.hasRole(Role.MODERATOR | Role.ADMIN)
    );
  }
}
