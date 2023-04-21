import { Component, OnDestroy, OnInit } from '@angular/core';
import { LocalUserService } from '../../../@core/data/local-user.service';
import { switchMap, takeUntil } from 'rxjs/operators';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { UsersService } from '../../../@core/data/users.service';
import { User } from '../../../@core/models/user.model';
import { ReplaySubject, Subject } from 'rxjs';
import { Role } from '../../../@core/models/role.model';
import { Ban } from '../../../@core/models/ban.model';
import { UserFollowObject } from '../../../@core/models/follow.model';
import { ReportType } from '../../../@core/models/report-type.model';
import { NbToastrService, NbTrigger } from '@nebular/theme';

@Component({
  selector: 'user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private ngUnsub = new Subject();
  protected readonly Role = Role;
  protected readonly ReportType = ReportType;
  protected readonly NbTrigger = NbTrigger;
  userSubj$: ReplaySubject<User>;
  user: User;
  isLocal: boolean;
  isMapper: boolean;
  isVerified: boolean;
  isMod: boolean;
  isAdmin: boolean;
  avatar_url: string;
  avatar_loaded: boolean;
  followingUsers: UserFollowObject[];
  followedByUsers: UserFollowObject[];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public userService: LocalUserService,
    private usersService: UsersService,
    private toastService: NbToastrService
  ) {
    this.ReportType = ReportType;
    this.isLocal = true;
    this.userSubj$ = new ReplaySubject<User>(1);
    this.isMapper = false;
    this.isMod = false;
    this.isAdmin = false;
    this.isVerified = false;
    this.followingUsers = [];
    this.followedByUsers = [];
    this.avatar_url = '/assets/images/blank_avatar.jpg';
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
              .subscribe(
                (usr) => {
                  this.isLocal = idNum === usr.id;
                },
                (error) => {
                  this.toastService.danger(
                    error.message,
                    'Cannot get user profile'
                  );
                }
              );
            return this.usersService.getUser(idNum, {
              params: { expand: 'profile,stats' }
            });
          } else {
            this.isLocal = true;
            return this.userService.getLocalUser({
              params: { expand: 'profile,stats' }
            });
          }
        })
      )
      .subscribe(
        (usr) => {
          this.user = usr;
          this.isMapper = this.hasRole(Role.MAPPER);
          this.isMod = this.hasRole(Role.MODERATOR);
          this.isAdmin = this.hasRole(Role.ADMIN);
          this.isVerified = this.hasRole(Role.VERIFIED);
          this.userSubj$.next(usr);
          if (!this.hasBan(Ban.BANNED_AVATAR) && this.user.avatarURL) {
            this.avatar_url = this.user.avatarURL;
          }
          this.avatar_loaded = true;
          this.usersService.getUserFollows(this.user).subscribe(
            (resp) => {
              this.followingUsers = resp.followed;
            },
            (err) =>
              this.toastService.danger(
                err.message,
                'Could not retrieve user follows'
              )
          );
          this.usersService.getFollowersOfUser(this.user).subscribe(
            (resp) => {
              this.followedByUsers = resp.followers;
            },
            (err) =>
              this.toastService.danger(
                err.message,
                'Could not retrieve user following'
              )
          );
        },
        (error) => {
          this.toastService.danger(error.message, 'Cannot get user details');
        }
      );
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
