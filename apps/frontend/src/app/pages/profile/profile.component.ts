import { Component, OnDestroy, OnInit } from '@angular/core';
import { switchMap, takeUntil } from 'rxjs/operators';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { ReplaySubject, Subject } from 'rxjs';
import {
  Ban,
  ISOCountryCode,
  ReportType,
  Role,
  Socials,
  SocialsData
} from '@momentum/constants';
import { Follow, User } from '@momentum/constants';
import { LocalUserService, UsersService } from '@momentum/frontend/data';
import { Icon } from '@momentum/frontend/icons';
import { ProfileCreditsComponent } from './profile-credits/profile-credits.component';
import { ProfileRunHistoryComponent } from './profile-run-history/profile-run-history.component';
import { ProfileFollowComponent } from './profile-follow/profile-follow.component';
import { SharedModule } from '../../shared.module';
import { ActivityCardComponent } from '../../components/activity/activity-card/activity-card.component';
import { ReportButtonComponent } from '../../components/report/report-button/report-button.component';
import { MessageService } from 'primeng/api';
import { RoleBadgesComponent } from '../../components/roles/role-badges.component';

@Component({
  selector: 'm-user-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: true,
  imports: [
    SharedModule,
    ActivityCardComponent,
    ReportButtonComponent,
    ProfileFollowComponent,
    ProfileRunHistoryComponent,
    ProfileCreditsComponent,
    RoleBadgesComponent
  ]
})
export class ProfileComponent implements OnInit, OnDestroy {
  private readonly ngUnsub = new Subject<void>();
  protected readonly Role = Role;
  protected readonly ReportType = ReportType;
  protected readonly SocialsData = SocialsData as Readonly<
    Record<
      keyof Socials,
      {
        // We can't enforce this type-constraint in @momentum/constants because
        // of module boundaries, but we need it here.
        icon: Icon;
        regex: RegExp;
        example: string;
        url: string;
      }
    >
  >;
  userSubject: ReplaySubject<User>;
  user: User;
  isLocal: boolean;
  isMapper: boolean;
  isVerified: boolean;
  isMod: boolean;
  isAdmin: boolean;
  isDeleted: boolean;
  avatarUrl: string;
  avatarLoaded: boolean;
  countryDisplayName: string;
  followingUsers: Follow[];
  followedByUsers: Follow[];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public localUserService: LocalUserService,
    private usersService: UsersService,
    private messageService: MessageService
  ) {
    this.ReportType = ReportType;
    this.isLocal = true;
    this.userSubject = new ReplaySubject<User>(1);
    this.isMapper = false;
    this.isMod = false;
    this.isAdmin = false;
    this.isDeleted = false;
    this.isVerified = false;
    this.followingUsers = [];
    this.followedByUsers = [];
    this.avatarUrl = '/assets/images/blank_avatar.jpg';
    this.countryDisplayName = '';
  }

  ngOnInit() {
    this.route.paramMap
      .pipe(
        switchMap((params: ParamMap) => {
          if (params.has('id')) {
            const id = Number(params.get('id'));
            if (
              !this.localUserService.isLoggedIn() ||
              this.localUserService.localUser?.id !== id
            ) {
              this.isLocal = false;
              return this.usersService.getUser(id, {
                expand: ['profile', 'userStats']
              });
            }
          }
          this.isLocal = true;
          this.localUserService.refreshLocalUser();
          return this.localUserService.localUserSubject;
        }),
        takeUntil(this.ngUnsub)
      )
      .subscribe({
        next: (user) => {
          this.user = user;
          this.user.profile.socials ??= {}; // So we can ngFor over this safely
          this.isMapper = this.hasRole(Role.MAPPER);
          this.isMod = this.hasRole(Role.MODERATOR);
          this.isAdmin = this.hasRole(Role.ADMIN);
          this.isDeleted = this.hasRole(Role.DELETED);
          this.isVerified = this.hasRole(Role.VERIFIED);
          this.userSubject.next(user);
          if (!this.hasBan(Ban.AVATAR) && this.user.avatarURL)
            this.avatarUrl = this.user.avatarURL;

          this.avatarLoaded = true;
          this.countryDisplayName = ISOCountryCode[this.user.country];
          this.usersService.getUserFollows(this.user).subscribe({
            next: (response) => (this.followingUsers = response.data),
            error: (error) =>
              this.messageService.add({
                severity: 'error',
                summary: 'Could not retrieve user follows',
                detail: error.message
              })
          });
          this.usersService.getFollowersOfUser(this.user).subscribe({
            next: (response) => (this.followedByUsers = response.data),
            error: (error) =>
              this.messageService.add({
                severity: 'error',
                detail: error.message,
                summary: 'Could not retrieve user following'
              })
          });
        },
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Cannot get user details',
            detail: error.message
          })
      });
  }

  ngOnDestroy() {
    this.ngUnsub.next();
    this.ngUnsub.complete();
  }

  hasRole(role: Role) {
    if (!this.user) return false;
    return this.localUserService.hasRole(role, this.user);
  }

  hasBan(ban: Ban) {
    if (!this.user) return false;
    return this.localUserService.hasBan(ban, this.user);
  }

  onEditProfile() {
    this.router.navigate([
      `/profile/${this.isLocal ? '' : this.user.id + '/'}edit`
    ]);
  }

  canEdit(): boolean {
    return (
      this.isLocal || this.localUserService.hasRole(Role.MODERATOR | Role.ADMIN)
    );
  }
}
