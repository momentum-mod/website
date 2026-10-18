import { Component, OnInit, inject } from '@angular/core';
import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DatePickerModule } from 'primeng/datepicker';
import {
  DialogService,
  DynamicDialogConfig,
  DynamicDialogRef
} from 'primeng/dynamicdialog';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import * as Bitflags from '@momentum/bitflags';
import {
  Ban,
  ChatBan,
  ChatBanTypeNames,
  Flags,
  Role,
  User
} from '@momentum/constants';

import { AdminService } from '../../../services/data/admin.service';
import { LocalUserService } from '../../../services/data/local-user.service';
import { AuthService } from '../../../services/data/auth.service';
import { UserSearchComponent } from '../../../components/search/user-search.component';
import { AvatarComponent } from '../../../components/avatar/avatar.component';
import { SpinnerDirective } from '../../../directives/spinner.directive';
import { ConfirmDialogComponent } from '../../../components/dialogs/confirm-dialog.component';
import { CodeVerifyDialogComponent } from '../../../components/dialogs/code-verify-dialog.component';
import {
  ConfirmWithReasonDialogComponent,
  ConfirmWithReasonDialogResult
} from '../../../components/dialogs/confirm-with-reason-dialog.component';

/** A chat/voice ban as displayed in this popup, plus its pending expiry edit. */
interface BanView extends ChatBan {
  expiryEdit?: Date | null;
}

@Component({
  selector: 'm-profile-admin-settings',
  templateUrl: './profile-admin-settings.component.html',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DatePickerModule,
    DatePipe,
    RouterLink,
    UserSearchComponent,
    AvatarComponent,
    SpinnerDirective
  ]
})
export class ProfileAdminSettingsComponent implements OnInit {
  private readonly ref = inject(DynamicDialogRef);
  private readonly config =
    inject<DynamicDialogConfig<{ user: User; isLocal: boolean }>>(
      DynamicDialogConfig
    );
  private readonly adminService = inject(AdminService);
  private readonly localUserService = inject(LocalUserService);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly nnfb = inject(NonNullableFormBuilder);

  protected readonly Role = Role;
  protected readonly Ban = Ban;
  protected readonly ChatBanTypeNames = ChatBanTypeNames;

  protected user: User;
  protected isLocal = false;
  protected isAdmin = false;

  protected chatBans: BanView[] = [];
  protected loadingChatBans = false;

  protected mergeUser: User | null = null;
  protected mergeErr = '';

  // Pending role/ban bitflag edits. Kept separate from `user.roles`/`user.bans`
  // so toggling a checkbox doesn't live-mutate the shared User object the rest
  // of the profile page is bound to before Save is actually clicked.
  private pendingRoles: Flags<Role> = 0 as Flags<Role>;
  private pendingBans: Flags<Ban> = 0 as Flags<Ban>;

  protected readonly adminEditForm = this.nnfb.group({
    banAlias: this.nnfb.control<boolean>(false),
    banBio: this.nnfb.control<boolean>(false),
    banAvatar: this.nnfb.control<boolean>(false),
    banLeaderboards: this.nnfb.control<boolean>(false),
    banMapSubmission: this.nnfb.control<boolean>(false),
    verified: this.nnfb.control<boolean>(false),
    mapper: this.nnfb.control<boolean>(false),
    porter: this.nnfb.control<boolean>(false),
    reviewer: this.nnfb.control<boolean>(false),
    limited: this.nnfb.control<boolean>(false),
    moderator: this.nnfb.control<boolean>(false),
    admin: this.nnfb.control<boolean>(false)
  });

  ngOnInit() {
    this.user = this.config.data.user;
    this.isLocal = this.config.data.isLocal;
    this.isAdmin = this.localUserService.isAdmin;

    this.pendingRoles = this.user.roles;
    this.pendingBans = this.user.bans;
    this.adminEditForm.patchValue({
      banAlias: this.hasBan(Ban.ALIAS),
      banBio: this.hasBan(Ban.BIO),
      banAvatar: this.hasBan(Ban.AVATAR),
      banLeaderboards: this.hasBan(Ban.LEADERBOARDS),
      banMapSubmission: this.hasBan(Ban.MAP_SUBMISSION),
      verified: this.hasRole(Role.VERIFIED),
      mapper: this.hasRole(Role.MAPPER),
      porter: this.hasRole(Role.PORTER),
      reviewer: this.hasRole(Role.REVIEWER),
      limited: this.hasRole(Role.LIMITED),
      moderator: this.hasRole(Role.MODERATOR),
      admin: this.hasRole(Role.ADMIN)
    });

    this.loadChatBans();
  }

  protected close() {
    this.ref.close();
  }

  //#region Roles/Bans

  protected hasRole(role: Role) {
    return Bitflags.has(this.pendingRoles, role);
  }

  protected hasBan(ban: Ban) {
    return Bitflags.has(this.pendingBans, ban);
  }

  protected toggleRole(role: Role) {
    this.pendingRoles = this.hasRole(role)
      ? Bitflags.remove(this.pendingRoles, role)
      : Bitflags.add(this.pendingRoles, role);
  }

  protected toggleBan(ban: Ban) {
    this.pendingBans = this.hasBan(ban)
      ? Bitflags.remove(this.pendingBans, ban)
      : Bitflags.add(this.pendingBans, ban);
  }

  protected saveAdminSettings() {
    this.adminService
      .updateUser(this.user.id, {
        roles: this.pendingRoles,
        bans: this.pendingBans
      })
      .subscribe({
        next: () => {
          this.user.roles = this.pendingRoles;
          this.user.bans = this.pendingBans;
          this.messageService.add({
            severity: 'success',
            detail: 'Updated admin settings!'
          });
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Failed to update admin settings!',
            detail: httpError.error.message
          })
      });
  }

  //#endregion
  //#region Communication bans

  protected loadChatBans() {
    this.loadingChatBans = true;
    this.adminService
      .getChatBans({
        targetID: this.user.id,
        includeExpired: true,
        expand: ['issuer'],
        take: 100
      })
      .subscribe({
        next: (response) => {
          this.loadingChatBans = false;
          this.chatBans = response.data.map((ban) => ({
            ...ban,
            expiryEdit: ban.expiresAt ? new Date(ban.expiresAt) : null
          }));
        },
        error: (httpError: HttpErrorResponse) => {
          this.loadingChatBans = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not retrieve chat bans',
            detail: httpError.error.message
          });
        }
      });
  }

  protected isActive(ban: ChatBan) {
    return !ban.expiresAt || new Date(ban.expiresAt).getTime() > Date.now();
  }

  protected expiryLabel(ban: ChatBan): string {
    if (!ban.expiresAt) return 'Permanent';

    const remaining = new Date(ban.expiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'Expired';

    const minutes = Math.round(remaining / 60_000);
    if (minutes < 60) return `${minutes}m left`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h left`;

    return `${Math.round(hours / 24)}d left`;
  }

  protected saveExpiry(ban: BanView) {
    this.adminService
      .updateChatBan(ban.id, {
        expiresAt: ban.expiryEdit ? ban.expiryEdit.toISOString() : null
      })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Ban expiration updated'
          });
          this.loadChatBans();
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Could not update the ban',
            detail: httpError.error.message
          })
      });
  }

  protected revokeBan(ban: BanView) {
    this.adminService.revokeChatBan(ban.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Ban revoked'
        });
        this.loadChatBans();
      },
      error: (httpError: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Could not revoke the ban',
          detail: httpError.error.message
        })
    });
  }

  //#endregion
  //#region Merge / purge / delete

  protected selectMergeUser(user1: User) {
    if (this.user.id === user1.id) {
      this.mergeErr = 'Cannot merge the same user onto themselves!';
      return;
    }
    this.mergeErr = '';
    this.mergeUser = user1;
  }

  protected cancelMerge() {
    this.mergeUser = null;
  }

  protected mergeUsers() {
    if (!this.mergeUser) return;
    this.dialogService
      .open(ConfirmDialogComponent, {
        header: 'Merge users?',
        data: {
          message: `You are about to merge the placeholder user <b>${this.user.alias}</b> with the user <b>${this.mergeUser.alias}</b>.
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
            const mergedID = this.mergeUser.id;
            this.mergeUser = null;
            this.ref.close();
            this.router.navigate([`/profile/${mergedID}`]);
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

  protected deleteRuns() {
    this.dialogService
      .open(ConfirmWithReasonDialogComponent, {
        header: 'Permanently delete all runs?',
        data: {
          message:
            "This will permanently delete all of this user's runs. This action is irreversible.<br><br>" +
            'Also note, this action involves renaming all run files, which is considerably slow for users with lots of runs.<br><br>' +
            'Are you sure you want to proceed?',
          proceedMessage: 'Confirm',
          abortMessage: 'Cancel'
        }
      })
      .onClose.subscribe(
        ({ confirmed, reason }: ConfirmWithReasonDialogResult) => {
          if (!confirmed) return;
          this.adminService.deleteAllRuns(this.user.id, reason).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                detail: 'Successfully purged user runs!'
              });
            },
            error: (httpError: HttpErrorResponse) =>
              this.messageService.add({
                severity: 'error',
                summary: 'Failed to purge user runs!',
                detail: httpError.error.message
              })
          });
        }
      );
  }

  protected deleteUser() {
    this.dialogService
      .open(CodeVerifyDialogComponent, {
        header: 'Delete user account',
        data: {
          message: `
            <p>
              This will <b>permanently</b> and <b>irrevocably</b> delete ${this.isLocal ? 'your' : "this user's"} account.
              ${this.isLocal ? 'If you do so, you will <b><i>never</i></b> be able to sign up from the same Steam account.' : ''}
            </p>
            <p>
              This feature only exists for privacy reasons, to give users the ability to delete all data identifiable to them from our systems.
              Unless you really want to do that, don't use this feature!
            </p>`
        }
      })
      .onClose.subscribe((response) => {
        if (!response) return;
        if (this.isLocal) this.deleteLocalUser();
        else this.deleteUserAsAdmin();
      });
  }

  private deleteUserAsAdmin() {
    this.adminService.deleteUser(this.user.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          detail: 'Successfully deleted user!'
        });
        this.ref.close();
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

  private deleteLocalUser() {
    this.localUserService.deleteUser().subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          detail: 'Successfully deleted user!'
        });
        this.ref.close();
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

  //#endregion
}
