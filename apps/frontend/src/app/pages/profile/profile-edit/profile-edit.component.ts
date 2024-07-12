import { Component, DestroyRef, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AdminUpdateUser,
  MAX_BIO_LENGTH,
  UpdateUser,
  User,
  Ban,
  ISOCountryCode,
  Role,
  Socials,
  SocialsData,
  NON_WHITESPACE_REGEXP
} from '@momentum/constants';
import * as Bitflags from '@momentum/bitflags';
import { omit } from '@momentum/util-fn';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { DropdownModule } from 'primeng/dropdown';
import { SharedModule } from '../../../shared.module';
import { Icon } from '../../../icons';
import { TitleService } from '../../../services/title.service';
import { UserSearchComponent } from '../../../components/search/user-search.component';
import { LocalUserService } from '../../../services/data/local-user.service';
import { UsersService } from '../../../services/data/users.service';
import { AdminService } from '../../../services/data/admin.service';
import { AuthService } from '../../../services/data/auth.service';
import { ConfirmDialogComponent } from '../../../components/dialogs/confirm-dialog.component';
import { CodeVerifyDialogComponent } from '../../../components/dialogs/code-verify-dialog.component';
import { EMPTY, switchMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'm-profile-edit',
  templateUrl: './profile-edit.component.html',
  standalone: true,
  imports: [SharedModule, UserSearchComponent, DropdownModule]
})
export class ProfileEditComponent implements OnInit {
  protected readonly AlphabeticalCountryCodes = Object.entries(ISOCountryCode)
    .sort(([_, a], [__, b]) => a.localeCompare(b))
    .map(([code, label]) => ({ code, label }));
  protected readonly Role = Role;
  protected readonly Ban = Ban;
  protected readonly SocialsData = SocialsData as Readonly<
    Record<
      keyof Socials,
      { icon: Icon; regex: RegExp; example: string; url: string }
    >
  >;

  // Built up in ctor
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

  protected user: User = null;
  protected mergeUser: User = null;
  protected mergeErr = null;
  protected isLocal = false;
  protected isAdmin = false;
  protected isModOrAdmin = false;

  protected readonly MAX_BIO_LENGTH = MAX_BIO_LENGTH;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly localUserService: LocalUserService,
    private readonly usersService: UsersService,
    private readonly adminService: AdminService,
    private readonly authService: AuthService,
    private readonly messageService: MessageService,
    private readonly dialogService: DialogService,
    private readonly fb: FormBuilder,
    private readonly destroyRef: DestroyRef,
    private readonly titleService: TitleService
  ) {
    const socialsForm = {};
    for (const [name, { regex }] of Object.entries(SocialsData)) {
      socialsForm[name] = ['', [Validators.pattern(regex)]];
    }

    this.form = this.fb.group({
      alias: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(32),
          Validators.pattern(NON_WHITESPACE_REGEXP)
        ]
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
    this.localUserService.user.subscribe(() => {
      this.isAdmin = this.localUserService.isAdmin;
      this.isModOrAdmin = this.localUserService.isModOrAdmin;
    });

    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params: ParamMap) => {
          if (!this.localUserService.isLoggedIn) {
            this.router.navigateByUrl('/');
            return EMPTY;
          }

          const id = Number(params.get('id') ?? -1);
          if (params.has('id') && this.localUserService.user.value?.id !== id) {
            this.isLocal = false;
            return this.usersService.getUser(id, {
              expand: ['profile', 'userStats']
            });
          }

          this.isLocal = true;
          return this.localUserService.user;
        })
      )
      .subscribe((user) => this.setUser(user));
  }

  setUser(user: User) {
    this.user = user;
    if (!this.isLocal) {
      this.titleService.setTitle(`Editing ${user.alias}'s profile`);
    }
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
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to update user profile!',
            detail: httpError.error.message
          })
      });
    } else {
      (update as AdminUpdateUser).roles = this.user.roles;
      (update as AdminUpdateUser).bans = this.user.bans;
      this.adminService.updateUser(this.user.id, update).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            detail: 'Updated user profile!'
          });
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to update user profile!',
            detail: httpError.error.message
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

    permStatus.banAlias && !this.isModOrAdmin
      ? this.alias.disable()
      : this.alias.enable();
    permStatus.banBio && !this.isModOrAdmin
      ? this.bio.disable()
      : this.bio.enable();

    this.adminEditForm.patchValue(permStatus);
  }

  returnToProfile() {
    this.router.navigate([`/profile/${this.user.id}`]);
  }

  deleteUser() {
    this.dialogService
      .open(CodeVerifyDialogComponent, {
        header: 'Delete user account',
        data: {
          message: `
            <p>
              This will <b>permanently</b> and <b>irrevocably</b> delete your account. If you do so, you will <b><i>never</i></b> be able to sign up
              from the same Steam account.
            </p>
            <p>
              This feature only exists for privacy reasons, to give users the ability to delete all data identifiable to them from our systems. Unless
              you really want to do that, don't use this feature!
            </p>
            <p>
              Again, we are <b><i>not</i></b> going to help you recover your account if you do this.
            </p>`
        }
      })
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
      error: (httpError: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to delete user!',
          detail: httpError.error.message
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
      error: (httpError: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to delete user!',
          detail: httpError.error.message
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
        header: 'Merge users?',
        data: {
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
          error: (httpError: HttpErrorResponse) =>
            this.messageService.add({
              severity: 'error',
              summary: 'Failed to merge users!',
              detail: httpError.error.message
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
      error: (httpError: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to reset alias to Steam alias!',
          detail: httpError.error.message
        })
    });
  }
}
