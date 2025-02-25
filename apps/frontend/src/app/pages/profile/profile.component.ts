import { Component, DestroyRef, OnInit } from '@angular/core';
import { filter, switchMap } from 'rxjs/operators';
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
  MapCreditNames,
  MapCreditType,
  MapCredit
} from '@momentum/constants';
import { MessageService } from 'primeng/api';
import { SharedModule } from '../../shared.module';
import { ProfileRunHistoryComponent } from './profile-run-history/profile-run-history.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TitleService } from '../../services/title.service';
import { ActivityComponent } from '../../components/activity/activity.component';
import { ReportButtonComponent } from '../../components/report/report-button/report-button.component';
import { RoleBadgesComponent } from '../../components/role-badges/role-badges.component';
import { TabsComponent } from '../../components/tabs/tabs.component';
import { TabComponent } from '../../components/tabs/tab.component';
import { Icon } from '../../icons';
import { LocalUserService } from '../../services/data/local-user.service';
import { UsersService } from '../../services/data/users.service';
import { ProgressBarModule } from 'primeng/progressbar';
import { XpSystemsService } from '../../services/xp-systems.service';
import { FontSizeLerpDirective } from '../../directives/font-size-lerp.directive';
import { DialogService } from 'primeng/dynamicdialog';
import { ProfileNotifyEditComponent } from './profile-notify-edit/profile-notify-edit.component';
import { HttpErrorResponse } from '@angular/common/http';
import { LevelIndicatorComponent } from '../../components/level-indicator/level-indicator.component';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'm-user-profile',
  templateUrl: './profile.component.html',
  standalone: true,
  imports: [
    SharedModule,
    ActivityComponent,
    ReportButtonComponent,
    ProfileRunHistoryComponent,
    RoleBadgesComponent,
    TabsComponent,
    TabComponent,
    ProgressBarModule,
    FontSizeLerpDirective,
    LevelIndicatorComponent,
    DialogModule
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
  protected readonly MapCreditNames = MapCreditNames;
  protected readonly MapCreditType = MapCreditType;

  userSubject = new BehaviorSubject<User>(null);
  user: User;
  isLocal = true;
  avatarUrl = '/assets/images/blank_avatar.jpg';
  avatarLoaded: boolean;
  countryDisplayName = '';
  followingUsers: Follow[] = [];
  followedByUsers: Follow[] = [];
  localFollowStatus = new BehaviorSubject<Follow>(null);
  level: number;
  xp: number;
  currLevelXp: number;
  nextLevelXp: number;
  importSteamFriendsModalVisible = false;
  steamFriends: User[] = [];
  steamFriendsToAdd = new Set<number>();
  protected credits: MapCredit[];
  protected creditMap: Partial<Record<MapCreditType, MapCredit[]>>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    protected readonly localUserService: LocalUserService,
    private readonly usersService: UsersService,
    private readonly messageService: MessageService,
    private readonly destroyRef: DestroyRef,
    private readonly titleService: TitleService,
    private readonly xpService: XpSystemsService,
    private readonly dialogService: DialogService
  ) {}

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
              this.isLocal = false;
              return this.usersService.getUser(id, {
                expand: ['profile', 'userStats']
              });
            }
          }
          this.isLocal = true;
          this.localUserService.refreshLocalUser();
          return this.localUserService.user;
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
          if (this.user.avatarURL) this.avatarUrl = this.user.avatarURL;

          this.avatarLoaded = true;
          this.countryDisplayName = ISOCountryCode[this.user.country];

          this.level = user.userStats.level;
          this.xp = user.userStats.cosXP;
          this.currLevelXp = this.xpService.getCosmeticXpForLevel(this.level);
          this.nextLevelXp = this.xpService.getCosmeticXpForLevel(
            this.level + 1
          );

          this.usersService.getUserFollows(this.user).subscribe({
            next: (response) => (this.followingUsers = response.data),
            error: (httpError: HttpErrorResponse) =>
              this.messageService.add({
                severity: 'error',
                summary: 'Could not retrieve user follows',
                detail: httpError.error.message
              })
          });

          this.usersService
            .getMapCredits(this.user.id, {
              expand: ['map', 'info'],
              take: 100
            })
            .subscribe({
              next: (response) => {
                this.credits = response.data;
                this.creditMap = Object.groupBy<MapCreditType, MapCredit>(
                  response.data,
                  (credit) => credit.type
                );
              },
              error: (httpError: HttpErrorResponse) =>
                this.messageService.add({
                  severity: 'error',
                  summary: 'Cannot get user map credits',
                  detail: httpError.error.message
                })
            });

          this.localUserService
            .checkFollowStatus(this.user)
            .pipe(
              switchMap((response) => {
                this.localFollowStatus.next(response.local);
                return this.usersService.getFollowersOfUser(this.user);
              }),
              takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
              next: (response) => (this.followedByUsers = response.data),
              error: (httpError: HttpErrorResponse) =>
                this.messageService.add({
                  severity: 'error',
                  summary: 'Could not retrieve user followers',
                  detail: httpError.error.message
                })
            });

          this.localUserService.getSteamFriends().subscribe({
            next: (response) => {
              this.steamFriends = response;
            },
            error: (httpError: HttpErrorResponse) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Could not get Steam friends',
                detail: httpError.error.message
              });
            }
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
      this.localUserService.unfollowUser(this.user).subscribe(observer);
    } else {
      this.localUserService.followUser(this.user).subscribe(observer);
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
          .updateFollowStatus(this.user, response.newFlags)
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
    this.importSteamFriendsModalVisible = true;
  }

  toggleSteamFriend(user: User) {
    if (this.steamFriendsToAdd.has(user.id)) {
      this.steamFriendsToAdd.delete(user.id);
    } else {
      this.steamFriendsToAdd.add(user.id);
    }
  }

  selectAllSteamFriends() {
    this.steamFriendsToAdd = new Set(this.steamFriends.map((user) => user.id));
  }

  deselectAllSteamFriends() {
    this.steamFriendsToAdd.clear();
  }

  importSteamFriendsToFollow() {
    this.localUserService.followUsers(this.steamFriendsToAdd).subscribe({
      next: () => {
        this.importSteamFriendsModalVisible = false;
        this.steamFriends = this.steamFriends.filter(
          (user) => !this.steamFriendsToAdd.has(user.id)
        );
        this.steamFriendsToAdd.clear();

        this.usersService.getUserFollows(this.user).subscribe({
          next: (response) => (this.followingUsers = response.data),
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
