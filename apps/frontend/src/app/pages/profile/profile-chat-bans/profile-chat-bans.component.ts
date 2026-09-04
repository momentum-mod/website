import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActiveChatBan, ChatBanTypeNames, User } from '@momentum/constants';

import { AdminService } from '../../../services/data/admin.service';
import { LocalUserService } from '../../../services/data/local-user.service';

@Component({
  selector: 'm-profile-chat-bans',
  templateUrl: './profile-chat-bans.component.html',
  imports: [DatePipe]
})
export class ProfileChatBansComponent implements OnChanges {
  private readonly adminService = inject(AdminService);
  protected readonly localUserService = inject(LocalUserService);

  @Input({ required: true }) user: User;
  @Input() isLocal = false;

  protected readonly ChatBanTypeNames = ChatBanTypeNames;

  protected bans: ActiveChatBan[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['user']) this.load();
  }

  protected get activeBans(): ActiveChatBan[] {
    return this.bans.filter((ban) => this.isActive(ban));
  }

  protected isActive(ban: ActiveChatBan): boolean {
    return !ban.expiresAt || new Date(ban.expiresAt).getTime() > Date.now();
  }

  protected expiryLabel(ban: ActiveChatBan): string {
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

    // Mods/admins see the target's active bans regardless of whose profile
    // this is; a regular user only has their own active bans embedded in
    // GET /user, and can't see anyone else's.
    if (this.localUserService.isModOrAdmin) {
      this.adminService
        .getChatBans({
          targetID: this.user.id,
          expand: ['issuer'],
          take: 100
        })
        .subscribe({
          next: (response) => (this.bans = response.data),
          error: () => (this.bans = [])
        });
    } else if (this.isLocal) {
      this.bans = this.user.chatBans ?? [];
    } else {
      this.bans = [];
    }
  }
}
