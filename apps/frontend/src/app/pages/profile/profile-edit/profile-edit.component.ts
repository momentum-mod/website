import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { EMPTY, merge, Subject } from 'rxjs';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { DeleteUserDialogComponent } from '../../../components/delete-user-dialog/delete-user-dialog.component';
import { NbDialogService } from '@nebular/theme';
import {
  AdminUpdateUser,
  MAX_BIO_LENGTH,
  UpdateUser,
  User
} from '@momentum/constants';
import {
  AdminService,
  AuthService,
  LocalUserService,
  UsersService
} from '@momentum/frontend/data';
import {
  Ban,
  ISOCountryCode,
  Role,
  Socials,
  SocialsData
} from '@momentum/constants';
import { Bitflags } from '@momentum/bitflags';
import { Icon } from '@momentum/frontend/icons';
import { omit } from 'lodash-es';
import { SharedModule } from '../../../shared.module';
import { UserSearchComponent } from '../../../components/search/user-search/user-search.component';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'm-profile-edit',
  templateUrl: './profile-edit.component.html',
  standalone: true,
  imports: [SharedModule, UserSearchComponent]
})
export class ProfileEditComponent implements OnInit, OnDestroy {
  protected readonly AlphabeticalCountryCode = Object.fromEntries(
    Object.entries(ISOCountryCode).sort(([_, a], [__, b]) => a.localeCompare(b))
  );
  protected readonly Role = Role;
  protected readonly Ban = Ban;
  protected readonly SocialsData = SocialsData as Readonly<
    Record<
      keyof Socials,
      { icon: Icon; regex: RegExp; example: string; url: string }
    >
  >;

  form: FormGroup;
  adminEditForm: FormGroup;

  get alias() {
    return this.form.get('alias');
  }
  get bio() {
    return this.form.get('bio');
  }
  get country() {
    return this.form.get('country');
  }
  get socials() {
    return this.form.get('socials');
  }

  user: User;
  mergeUser: User;
  mergeErr: string;
  isLocal: boolean;
  isAdmin: boolean;
  isModerator: boolean;

  private ngUnsub = new Subject<void>();
  refreshCurrentUser = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private localUserService: LocalUserService,
    private usersService: UsersService,
    private adminService: AdminService,
    private authService: AuthService,
    private messageService: MessageService,
    private dialogService: NbDialogService,
    private fb: FormBuilder
  ) {
    this.user = null;
    this.isLocal = true;
    this.isAdmin = false;
    this.mergeUser = null;
    this.mergeErr = null;

    const socialsForm = {};
    for (const [name, { regex }] of Object.entries(SocialsData)) {
      socialsForm[name] = ['', [Validators.pattern(regex)]];
    }

    this.form = this.fb.group({
      alias: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(32)]
      ],
      bio: ['', [Validators.maxLength(MAX_BIO_LENGTH)]],
      country: [''],
      socials: this.fb.group(socialsForm)
    });

    this.adminEditForm = this.fb.group({
      banAlias: [false],
      banBio: [false],
      banAvatar: [false],
      banLeaderboards: [false],
      banMapSubmission: [false],
      verified: [false],
      mapper: [false],
      moderator: [false],
      admin: [false]
    });
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params: ParamMap) => {
          if (!this.localUserService.isLoggedIn()) {
            this.router.navigateByUrl('/');
            return EMPTY;
          }

          if (params.has('id')) {
            const id = Number(params.get('id'));
            if (this.localUserService.localUser?.id !== id) {
              this.isLocal = false;
              return merge(
                this.usersService
                  .getUser(id, { expand: ['profile', 'userStats'] })
                  .pipe(
                    take(1),
                    tap((user) => this.setUser(user))
                  ),
                this.refreshCurrentUser
              );
            }
          }

          this.localUserService.refreshLocalUser();
          return this.localUserService.localUserSubject.pipe(
            take(1),
            tap((user) => {
              this.isAdmin = this.localUserService.hasRole(Role.ADMIN, user);
              this.isModerator = this.localUserService.hasRole(
                Role.MODERATOR,
                user
              );
              if (this.isLocal) this.setUser(user);
            })
          );
        }),
        takeUntil(this.ngUnsub)
      )
      .subscribe();
  }

  setUser(user: User) {
    this.user = user;
    // On DTO profile stuff in within `profile` sub-object - for form we don't
    // want that nesting.
    this.form.patchValue({ ...omit(user, 'profile'), ...user.profile });
    this.checkUserPermissions();
  }

  onSubmit(): void {
    if (!this.form.valid) return;

    const update: AdminUpdateUser | UpdateUser = this.form.value; // Intersection to skip annoying casts

    // Don't include empty values on update input (they'd fail backend
    // validation!)
    for (const [k, v] of Object.entries(update.socials)) {
      if (v === '') delete update.socials[k];
    }

    // We log /admin queries separately so really worth using the /user endpoint
    // whenever possible. So only do the /admin call is it's got admin-specific
    // stuff on.
    if (
      this.isLocal &&
      (!this.isAdmin || !(this.user.bans || this.user.roles))
    ) {
      this.localUserService.updateUser(update).subscribe({
        next: () => {
          this.localUserService.refreshLocalUser();
          this.messageService.add({
            severity: 'success',
            detail: 'Updated user profile!'
          });
        },
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to update user profile!',
            detail: error.message
          })
      });
    } else {
      (update as AdminUpdateUser).roles = this.user.roles;
      (update as AdminUpdateUser).bans = this.user.bans;
      this.adminService.updateUser(this.user.id, update).subscribe({
        next: () => {
          if (this.isLocal) {
            this.localUserService.refreshLocalUser();
          } else {
            this.refreshCurrentUser.next();
          }
          this.messageService.add({
            severity: 'success',
            detail: 'Updated user profile!'
          });
        },
        error: (error) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to update user profile!',
            detail: error.message
          })
      });
    }
  }

  toggleRole(role: Role) {
    this.user.roles = this.hasRole(role)
      ? Bitflags.remove(this.user.roles, role)
      : Bitflags.add(this.user.roles, role);
    this.checkUserPermissions();
  }

  toggleBan(ban: Ban) {
    this.user.bans = this.hasBan(ban)
      ? Bitflags.remove(this.user.bans, ban)
      : Bitflags.add(this.user.bans, ban);
    this.checkUserPermissions();
  }

  hasRole(role: Role) {
    return this.localUserService.hasRole(role, this.user);
  }

  hasBan(ban: Ban) {
    return this.localUserService.hasBan(ban, this.user);
  }

  checkUserPermissions() {
    const permStatus = {
      banAlias: this.hasBan(Ban.ALIAS),
      banBio: this.hasBan(Ban.BIO),
      banAvatar: this.hasBan(Ban.AVATAR),
      banLeaderboards: this.hasBan(Ban.LEADERBOARDS),
      banMapSubmission: this.hasBan(Ban.MAP_SUBMISSION),
      verified: this.hasRole(Role.VERIFIED),
      mapper: this.hasRole(Role.MAPPER),
      moderator: this.hasRole(Role.MODERATOR),
      admin: this.hasRole(Role.ADMIN)
    };

    permStatus.banAlias && !(this.isAdmin || this.isModerator)
      ? this.alias.disable()
      : this.alias.enable();
    permStatus.banBio && !(this.isAdmin || this.isModerator)
      ? this.bio.disable()
      : this.bio.enable();

    this.adminEditForm.patchValue(permStatus);
  }

  returnToProfile() {
    this.router.navigate([`/profile/${this.user.id}`]);
  }

  deleteUser() {
    this.dialogService
      .open(DeleteUserDialogComponent)
      .onClose.subscribe((response) => {
        if (!response) return;
        if (this.isLocal) this.deleteLocalUser();
        else this.deleteUserAsAdmin();
      });
  }

  deleteUserAsAdmin() {
    this.adminService.deleteUser(this.user.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          detail: 'Successfully deleted user!'
        });
        this.router.navigate(['/']);
      },
      error: (error) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to delete user!',
          detail: error.message
        })
    });
  }

  deleteLocalUser() {
    this.localUserService.deleteUser().subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          detail: 'Successfully deleted user!'
        });
        this.authService.logout();
      },
      error: (error) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to delete user!',
          detail: error.message
        })
    });
  }

  selectMergeUser(user1: User) {
    if (this.user.id === user1.id) {
      this.mergeErr = 'Cannot merge the same user onto themselves!';
      return;
    }
    this.mergeErr = null;
    this.mergeUser = user1;
  }

  mergeUsers() {
    if (!this.mergeUser) return;
    this.dialogService
      .open(ConfirmDialogComponent, {
        context: {
          title: 'Merge users?',
          message: `You are about to merge the placeholder user ${this.user.alias} with the user ${this.mergeUser.alias}.
        This will merge over all activities, credits, and user follows, and then delete the placeholder user!
        Are you sure you want to proceed?`
        }
      })
      .onClose.subscribe((response) => {
        if (!response) return;
        this.adminService.mergeUsers(this.user, this.mergeUser).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              detail: 'Successfully merged the two users!'
            });
            this.router.navigate([`/profile/${this.mergeUser.id}`]);
            this.mergeUser = null;
          },
          error: (error) =>
            this.messageService.add({
              severity: 'error',
              summary: 'Failed to merge users!',
              detail: error.message
            })
        });
      });
  }

  cancelMerge() {
    this.mergeUser = null;
  }

  resetAlias() {
    this.localUserService.resetAliasToSteamAlias().subscribe({
      next: () => {
        this.localUserService.refreshLocalUser();
        this.messageService.add({
          severity: 'success',
          detail: 'Successfully reset alias to Steam name!'
        });
      },
      error: (error) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to reset alias to Steam alias!',
          detail: error.message
        })
    });
  }

  ngOnDestroy(): void {
    this.ngUnsub.next();
    this.ngUnsub.complete();
  }
}
