import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { filter, switchMap, tap } from 'rxjs/operators';
import {
  ActivatedRoute,
  ParamMap,
  Router,
  RouterModule
} from '@angular/router';
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
  MapCreditNames,
  MapCreditType,
  MapCredit
} from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TitleService } from '../../services/title.service';
import { ActivityComponent } from '../../components/activity/activity.component';
import { ReportButtonComponent } from '../../components/report/report-button/report-button.component';
import { RoleBadgesComponent } from '../../components/role-badges/role-badges.component';
import { Icon, IconComponent } from '../../icons';
import { LocalUserService } from '../../services/data/local-user.service';
import { UsersService } from '../../services/data/users.service';
import { ProgressBarModule } from 'primeng/progressbar';
import { XpSystemsService } from '../../services/xp-systems.service';
import { FontSizeLerpDirective } from '../../directives/font-size-lerp.directive';
import { DialogService } from 'primeng/dynamicdialog';
import { ProfileNotifyEditComponent } from './profile-notify-edit/profile-notify-edit.component';
import { HttpErrorResponse } from '@angular/common/http';
import { LevelIndicatorComponent } from '../../components/level-indicator/level-indicator.component';
import { EnumValuePipe } from '../../pipes/enum-value.pipe';
import { SpinnerDirective } from '../../directives/spinner.directive';
import { AsyncPipe, DatePipe, NgStyle } from '@angular/common';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { UnsortedKeyvaluePipe } from '../../pipes/unsorted-keyvalue.pipe';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { DialogModule } from 'primeng/dialog';
import { ProfileChatBansComponent } from './profile-chat-bans/profile-chat-bans.component';
import { ProfileAdminSettingsComponent } from './profile-admin-settings/profile-admin-settings.component';

@Component({
  selector: 'm-user-profile',
  templateUrl: './profile.component.html',
  imports: [
    ActivityComponent,
    ReportButtonComponent,
    RoleBadgesComponent,
    ProgressBarModule,
    FontSizeLerpDirective,
    LevelIndicatorComponent,
    SpinnerDirective,
    RouterModule,
    EnumValuePipe,
    DatePipe,
    NgStyle,
    IconComponent,
    AsyncPipe,
    TooltipDirective,
    UnsortedKeyvaluePipe,
    AvatarComponent,
    SpinnerComponent,
    LevelIndicatorComponent,
    DialogModule,
    ProfileChatBansComponent
  ]
})
export class ProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly localUserService = inject(LocalUserService);
  private readonly usersService = inject(UsersService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly titleService = inject(TitleService);
  private readonly xpService = inject(XpSystemsService);
  private readonly dialogService = inject(DialogService);

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
  protected readonly MapCreditNames = MapCreditNames;
  protected readonly MapCreditType = MapCreditType;

  userSubject = new BehaviorSubject<User>(null);
  protected readonly user = signal<User>(null);
  protected readonly isLocal = signal(true);
  protected readonly avatarUrl = signal('/assets/images/blank_avatar.jpg');
  protected readonly avatarLoaded = signal(false);
  protected readonly countryDisplayName = signal('');
  protected readonly followingUsers = signal<Follow[]>([]);
  protected readonly followedByUsers = signal<Follow[]>([]);
  localFollowStatus = new BehaviorSubject<Follow>(null);
  protected readonly level = computed(() => this.user()?.userStats?.level);
  protected readonly xp = computed(() => this.user()?.userStats?.cosXP);
  protected readonly currLevelXp = computed(() =>
    this.xpService.getCosmeticXpForLevel(this.level())
  );
  protected readonly nextLevelXp = computed(() =>
    this.xpService.getCosmeticXpForLevel(this.level() + 1)
  );
  protected readonly importSteamFriendsModalVisible = signal(false);
  protected readonly steamFriends = signal<User[]>([]);
  protected readonly steamFriendsToAdd = signal(new Set<number>());
  protected readonly loadingSteamFriends = signal(false);
  protected readonly credits = signal<MapCredit[]>(null);
  protected readonly creditMap = computed(() =>
    Object.groupBy<MapCreditType, MapCredit>(
      this.credits() ?? [],
      (credit) => credit.type
    )
  );

  ngOnInit() {
    this.route.paramMap
      .pipe(
        switchMap((params: ParamMap) => {
          if (params.has('id')) {
            const id = Number(params.get('id'));
            if (
              !this.localUserService.isLoggedIn ||
              this.localUserService.user.value?.id !== id
            ) {
              this.isLocal.set(false);
              return this.usersService.getUser(id, {
                expand: ['profile', 'userStats']
              });
            }
          }
          this.isLocal.set(true);
          this.localUserService.refreshLocalUser();
          return this.localUserService.user;
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (user) => {
          this.user.set(user);
          if (!this.isLocal()) {
            this.titleService.setTitle(user.alias);
          }
          this.userSubject.next(user);
          if (user.avatarURL) this.avatarUrl.set(user.avatarURL);

          this.avatarLoaded.set(true);
          this.countryDisplayName.set(ISOCountryCode[user.country]);

          this.usersService.getUserFollows(user).subscribe({
            next: (response) => this.followingUsers.set(response.data),
            error: (httpError: HttpErrorResponse) =>
              this.messageService.add({
                severity: 'error',
                summary: 'Could not retrieve user follows',
                detail: httpError.error.message
              })
          });

          this.usersService
            .getMapCredits(user.id, {
              expand: ['map', 'info'],
              take: 100
            })
            .subscribe({
              next: (response) => this.credits.set(response.data),
              error: (httpError: HttpErrorResponse) =>
                this.messageService.add({
                  severity: 'error',
                  summary: 'Cannot get user map credits',
                  detail: httpError.error.message
                })
            });

          this.localUserService
            .checkFollowStatus(user)
            .pipe(
              switchMap((response) => {
                this.localFollowStatus.next(response.local);
                return this.usersService.getFollowersOfUser(user);
              }),
              takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
              next: (response) => this.followedByUsers.set(response.data),
              error: (httpError: HttpErrorResponse) =>
                this.messageService.add({
                  severity: 'error',
                  summary: 'Could not retrieve user followers',
                  detail: httpError.error.message
                })
            });
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Cannot get user details',
            detail: httpError.error.message
          })
      });
  }

  hasRole(role: Role) {
    if (!this.user()) return false;
    return this.localUserService.hasRole(role, this.user());
  }

  hasBan(ban: Ban) {
    if (!this.user()) return false;
    return this.localUserService.hasBan(ban, this.user());
  }

  onEditProfile() {
    this.router.navigate([
      `/profile/${this.isLocal() ? '' : this.user().id + '/'}edit`
    ]);
  }

  onAdminSettings() {
    this.dialogService
      .open(ProfileAdminSettingsComponent, {
        header: 'Admin Settings',
        data: { user: this.user(), isLocal: this.isLocal() },
        style: {
          'min-width': 'min(35rem, 95vw)',
          'max-width': 'min(55rem, 95vw)'
        }
      })
      .onClose.subscribe(() => this.refreshUser());
  }

  private refreshUser() {
    if (this.isLocal()) {
      this.localUserService.refreshLocalUser();
    } else {
      this.usersService
        .getUser(this.user().id, { expand: ['profile', 'userStats'] })
        .subscribe((user) => {
          this.user.set(user);
          this.userSubject.next(user);
        });
    }
  }

  toggleFollow() {
    const observer = {
      next: (follow?: Follow | void) =>
        this.localFollowStatus.next(follow || null),
      error: (httpError: HttpErrorResponse) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Could not toggle follow',
          detail: httpError.error.message
        });
      }
    };

    if (this.localFollowStatus.value) {
      this.localUserService.unfollowUser(this.user()).subscribe(observer);
    } else {
      this.localUserService.followUser(this.user()).subscribe(observer);
    }
  }

  editFollowNotifications() {
    if (!this.localFollowStatus) return;
    this.dialogService
      .open(ProfileNotifyEditComponent, {
        header: 'Edit Notification Settings',
        data: { flags: this.localFollowStatus.value.notifyOn }
      })
      .onClose.pipe(filter(Boolean))
      .subscribe((response) => {
        this.localUserService
          .updateFollowStatus(this.user(), response.newFlags)
          .subscribe({
            next: () =>
              this.localFollowStatus.next({
                ...this.localFollowStatus.value,
                notifyOn: response.newFlags
              }),
            error: (httpError: HttpErrorResponse) =>
              this.messageService.add({
                severity: 'error',
                summary: 'Could not update follow status',
                detail: httpError.error.message
              })
          });
      });
  }

  showSteamFriendsModal() {
    this.importSteamFriendsModalVisible.set(true);
    this.loadingSteamFriends.set(true);
    this.localUserService
      .getSteamFriends()
      .pipe(
        tap({
          error: () => this.loadingSteamFriends.set(false),
          next: () => this.loadingSteamFriends.set(false)
        })
      )
      .subscribe({
        next: (response) => {
          this.steamFriends.set(response);
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Could not get Steam friends',
            detail: httpError.error.message
          });
        }
      });
  }

  toggleSteamFriend(user: User) {
    this.steamFriendsToAdd.update((toAdd) => {
      const updated = new Set(toAdd);
      if (updated.has(user.id)) {
        updated.delete(user.id);
      } else {
        updated.add(user.id);
      }
      return updated;
    });
  }

  selectAllSteamFriends() {
    this.steamFriendsToAdd.set(
      new Set(this.steamFriends().map((user) => user.id))
    );
  }

  deselectAllSteamFriends() {
    this.steamFriendsToAdd.set(new Set());
  }

  importSteamFriendsToFollow() {
    this.localUserService.followUsers(this.steamFriendsToAdd()).subscribe({
      next: () => {
        this.importSteamFriendsModalVisible.set(false);
        this.steamFriends.update((friends) =>
          friends.filter((user) => !this.steamFriendsToAdd().has(user.id))
        );
        this.steamFriendsToAdd.set(new Set());

        this.usersService.getUserFollows(this.user()).subscribe({
          next: (response) => this.followingUsers.set(response.data),
          error: (httpError: HttpErrorResponse) =>
            this.messageService.add({
              severity: 'error',
              summary: 'Could not retrieve user follows',
              detail: httpError.error.message
            })
        });
      },
      error: (httpError: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Could not add friends',
          detail: httpError.error.message
        })
    });
  }
}
