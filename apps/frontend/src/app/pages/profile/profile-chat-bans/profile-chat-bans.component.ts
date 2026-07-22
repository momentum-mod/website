import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { ChatBanType, ChatBanTypeNames, User } from '@momentum/constants';

import { AdminService } from '../../../services/data/admin.service';
import { LocalUserService } from '../../../services/data/local-user.service';

/**
 * A chat/voice ban as displayed on a profile.
 *
 * Mods/admins fetch full bans (with an ID, issuer and history) from the admin
 * endpoint; a user viewing their own profile only has the minimal active bans
 * embedded in their `GET /user` response, so most fields are optional here.
 */
interface BanView {
  id?: number;
  type: ChatBanType;
  expiresAt: string | null;
  reason: string | null;
  createdAt?: string;
  reportID?: number | null;
  issuer?: User;
  // Pending expiry edit, bound to the datepicker
  expiryEdit?: Date | null;
}

@Component({
  selector: 'm-profile-chat-bans',
  templateUrl: './profile-chat-bans.component.html',
  imports: [DialogModule, DatePickerModule, FormsModule, DatePipe, RouterLink]
})
export class ProfileChatBansComponent implements OnChanges {
  private readonly adminService = inject(AdminService);
  private readonly messageService = inject(MessageService);
  protected readonly localUserService = inject(LocalUserService);

  @Input({ required: true }) user: User;
  @Input() isLocal = false;

  protected readonly ChatBanTypeNames = ChatBanTypeNames;

  protected bans: BanView[] = [];
  protected detailsVisible = false;
  protected loading = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['user']) this.load();
  }

  /** Only mods/admins can see history and revoke/edit bans. */
  protected get canManage(): boolean {
    return this.localUserService.isModOrAdmin;
  }

  protected get activeBans(): BanView[] {
    return this.bans.filter((ban) => this.isActive(ban));
  }

  protected isActive(ban: BanView): boolean {
    return !ban.expiresAt || new Date(ban.expiresAt).getTime() > Date.now();
  }

  protected expiryLabel(ban: BanView): string {
    if (!ban.expiresAt) return 'Permanent';

    const remaining = new Date(ban.expiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'Expired';

    const minutes = Math.round(remaining / 60_000);
    if (minutes < 60) return `${minutes}m left`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h left`;

    return `${Math.round(hours / 24)}d left`;
  }

  private load() {
    if (!this.user) {
      this.bans = [];
      return;
    }

    if (this.canManage) {
      this.loading = true;
      this.adminService
        .getChatBans({
          targetID: this.user.id,
          includeExpired: true,
          expand: ['issuer'],
          take: 100
        })
        .subscribe({
          next: (response) => {
            this.loading = false;
            this.bans = response.data.map((ban) => ({
              ...ban,
              expiryEdit: ban.expiresAt ? new Date(ban.expiresAt) : null
            }));
          },
          error: (httpError: HttpErrorResponse) => {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Could not retrieve chat bans',
              detail: httpError.error.message
            });
          }
        });
    } else if (this.isLocal) {
      // Only the active bans embedded in the local user's own data
      this.bans = (this.user.chatBans ?? []) as BanView[];
    } else {
      this.bans = [];
    }
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
          this.load();
        },
        error: (httpError: HttpErrorResponse) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Could not update the ban',
            detail: httpError.error.message
          })
      });
  }

  protected revoke(ban: BanView) {
    this.adminService.revokeChatBan(ban.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Ban revoked'
        });
        this.load();
      },
      error: (httpError: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Could not revoke the ban',
          detail: httpError.error.message
        })
    });
  }
}
