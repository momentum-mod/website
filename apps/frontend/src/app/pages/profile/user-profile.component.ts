import { Component, OnDestroy, OnInit } from '@angular/core';
import { switchMap, takeUntil } from 'rxjs/operators';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { ReplaySubject, Subject } from 'rxjs';
import {
  NbToastrService,
  NbCardModule,
  NbButtonModule,
  NbIconModule,
  NbTooltipModule,
  NbTabsetModule,
  NbListModule,
  NbUserModule
} from '@nebular/theme';
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
import { UnsortedKeyvaluePipe } from '../../../../../../libs/frontend/pipes/src/lib/unsorted-keyvalue.pipe';
import { ActivityCardComponent } from '../../components/activity/activity-card/activity-card.component';
import { ProfileCreditsComponent } from './profile-credits/profile-credits.component';
import { ProfileRunHistoryComponent } from './profile-run-history/profile-run-history.component';
import { ProfileFollowComponent } from './profile-follow/profile-follow.component';
import { NbIconIconDirective } from '../../../../../../libs/frontend/directives/src/lib/icons/nb-icon-icon.directive';
import { ReportButtonComponent } from '../../components/report/report-button/report-button.component';
import { NgIf, NgStyle, NgOptimizedImage, NgFor } from '@angular/common';

@Component({
  selector: 'mom-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    NbCardModule,
    ReportButtonComponent,
    NbButtonModule,
    NbIconModule,
    NbIconIconDirective,
    NgStyle,
    NgOptimizedImage,
    NbTooltipModule,
    NgFor,
    ProfileFollowComponent,
    NbTabsetModule,
    NbListModule,
    RouterLink,
    NbUserModule,
    ProfileRunHistoryComponent,
    ProfileCreditsComponent,
    ActivityCardComponent,
    UnsortedKeyvaluePipe
  ]
})
export class UserProfileComponent implements OnInit, OnDestroy {
  private ngUnsub = new Subject<void>();
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
              expand: ['profile', 'userStats']
            });
          } else {
            this.isLocal = true;
            return this.userService.getLocalUser({
              expand: ['profile', 'userStats']
            });
          }
        })
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
              this.toastService.danger(
                error.message,
                'Could not retrieve user follows'
              )
          });
          this.usersService.getFollowersOfUser(this.user).subscribe({
            next: (response) => (this.followedByUsers = response.data),
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
