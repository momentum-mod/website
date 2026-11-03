import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { DatePipe } from '@angular/common';
import { ActiveChatBan, ChatBanTypeNames, User } from '@momentum/constants';
import { AdminService } from '../../../services/data/admin.service';
import { LocalUserService } from '../../../services/data/local-user.service';

@Component({
  selector: 'm-profile-chat-bans',
  templateUrl: './profile-chat-bans.component.html',
  imports: [DatePipe]
})
export class ProfileChatBansComponent {
  private readonly adminService = inject(AdminService);
  protected readonly localUserService = inject(LocalUserService);

  readonly user = input.required<User>();
  readonly isLocal = input(false);

  protected readonly ChatBanTypeNames = ChatBanTypeNames;

  // Reloads only when `user` changes.
  private readonly bans = toSignal(
    toObservable(this.user).pipe(switchMap((user) => this.load(user))),
    { initialValue: [] as ActiveChatBan[] }
  );

  protected readonly activeBans = computed(() =>
    this.bans().filter((ban) => this.isActive(ban))
  );

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

  private load(user: User | undefined): Observable<ActiveChatBan[]> {
    if (!user) return of([]);

    // Mods/admins see the target's active bans regardless of whose profile
    // this is; a regular user only has their own active bans embedded in
    // GET /user, and can't see anyone else's.
    if (this.localUserService.isModOrAdmin) {
      return this.adminService
        .getChatBans({
          targetID: user.id,
          expand: ['issuer'],
          take: 100
        })
        .pipe(
          map((response) => response.data),
          catchError(() => of([]))
        );
    } else if (this.isLocal()) {
      return of(user.chatBans ?? []);
    } else {
      return of([]);
    }
  }
}
