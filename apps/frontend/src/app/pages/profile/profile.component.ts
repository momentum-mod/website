import { Component, DestroyRef, OnInit } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import {
  Ban,
  ISOCountryCode,
  ReportType,
  Role,
  Socials,
  SocialsData,
  Follow,
  User,
  CombinedRoles
} from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { TabViewModule } from 'primeng/tabview';
import { LocalUserService, UsersService } from '../../services';
import { Icon } from '../../icons';
import { SharedModule } from '../../shared.module';
import {
  ReportButtonComponent,
  RoleBadgesComponent,
  AvatarComponent,
  ActivityComponent,
  TabsComponent,
  TabComponent
} from '../../components';
import { UnsortedKeyvaluePipe } from '../../pipes';
import { ProfileFollowComponent } from './profile-follow/profile-follow.component';
import { ProfileRunHistoryComponent } from './profile-run-history/profile-run-history.component';
import { ProfileCreditsComponent } from './profile-credits/profile-credits.component';
import { Bitflags } from '@momentum/bitflags';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TitleService } from '../../services/title.service';

@Component({
  selector: 'm-user-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: true,
  imports: [
    SharedModule,
    ActivityComponent,
    ReportButtonComponent,
    ProfileFollowComponent,
    ProfileRunHistoryComponent,
    ProfileCreditsComponent,
    RoleBadgesComponent,
    TabViewModule,
    AvatarComponent,
    UnsortedKeyvaluePipe,
    TabsComponent,
    TabComponent
  ]
})
export class ProfileComponent implements OnInit {
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
  userSubject = new BehaviorSubject<User>(null);
  user: User;
  isLocal = true;
  avatarUrl = '/assets/images/blank_avatar.jpg';
  avatarLoaded: boolean;
  countryDisplayName = '';
  followingUsers: Follow[] = [];
  followedByUsers: Follow[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly localUserService: LocalUserService,
    private readonly usersService: UsersService,
    private readonly messageService: MessageService,
    private readonly destroyRef: DestroyRef,
    private readonly titleService: TitleService
  ) {}

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
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (user) => {
          this.user = user;
          if (!this.isLocal) {
            this.titleService.setTitle(user.alias);
          }
          this.user.profile.socials ??= {}; // So we can ngFor over this safely
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

  onAdminActivity() {
    this.router.navigate([`/admin/admin-activity/${this.user.id}/`]);
  }

  canSeeAdminActivity(): boolean {
    return (
      this.localUserService.hasRole(CombinedRoles.MOD_OR_ADMIN) &&
      (this.isLocal ||
        Bitflags.has(CombinedRoles.MOD_OR_ADMIN, this.user.roles))
    );
  }
}
