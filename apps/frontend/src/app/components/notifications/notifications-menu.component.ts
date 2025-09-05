import { Component, DestroyRef, inject, OnInit, output } from '@angular/core';
import {
  Notification,
  NotificationsMarkAsReadQuery,
  NotificationType
} from '@momentum/constants';
import { IconComponent } from '../../icons';
import { TooltipDirective } from '../../directives/tooltip.directive';
import { NotificationsService } from '../../services/data/notifications.service';
import { merge, Subject, switchMap, take, tap } from 'rxjs';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { AnnouncementNotificationComponent } from './types/announcement-notification.component';
import { MapStatusChangeNotificationComponent } from './types/map-status-change-notification.component';
import { MapTestingInviteNotificationComponent } from './types/map-testing-invite-notification.component';
import { MapReviewPostedNotificationComponent } from './types/map-review-posted-notification.component';
import { MapReviewCommentPostedNotificationComponent } from './types/map-review-comment-posted-notification.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'm-notifications-menu',
  imports: [
    PaginatorModule,
    AnnouncementNotificationComponent,
    MapStatusChangeNotificationComponent,
    MapTestingInviteNotificationComponent,
    MapReviewPostedNotificationComponent,
    MapReviewCommentPostedNotificationComponent,
    IconComponent,
    TooltipDirective
  ],
  templateUrl: 'notifications-menu.component.html',
  styles: `
    :host {
      display: flex;
    }
  `
})
export class NotificationsMenuComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly NotificationType = NotificationType;

  protected notifications: Notification[] = [];
  unreadNotificationsCount = output<number>();

  protected first = 0;
  protected rows = 15;
  protected _unreadCount = 0; // Only used by paginator.
  protected readonly pageChange = new Subject<PaginatorState>();
  protected readonly refresh = new Subject<void>();

  protected loading = false;

  ngOnInit() {
    this.unreadNotificationsCount.subscribe((count: number) => {
      this._unreadCount = count;
    });

    merge(
      this.refresh,
      this.pageChange.pipe(tap(({ first }) => (this.first = first)))
    )
      .pipe(
        tap(() => (this.loading = true)),
        switchMap(() =>
          this.notificationsService.getNotifications({
            take: this.rows,
            skip: this.first
          })
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (pagedResponse) => {
          // Show test invites first, can't orderBy specific type on backend.
          this.notifications = pagedResponse.data.sort((a, b) => {
            return a.type === NotificationType.MAP_TESTING_INVITE
              ? -1
              : Date.parse(b.createdAt) - Date.parse(a.createdAt);
          });
          this.unreadNotificationsCount.emit(pagedResponse.totalCount);
          this.loading = false;
        },
        error: () => (this.loading = false)
      });

    this.refresh.next();
  }

  removeNotification(index: number) {
    this.updateNotifications(index);
  }

  clearNotifications() {
    this.updateNotifications();
  }

  updateNotifications(removeIndex?: number) {
    const queryOptions: NotificationsMarkAsReadQuery =
      removeIndex !== undefined
        ? { notifIDs: [this.notifications[removeIndex].id] }
        : { all: true };

    this.notificationsService
      .markAsRead(queryOptions)
      .pipe(
        tap(() => (this.loading = true)),
        take(1)
      )
      .subscribe({
        next: () => this.refresh.next(),
        error: () => (this.loading = false)
      });
  }

  /**
   * Sub-components may perform actions that should prevent the user from
   * interacting with the menu.
   */
  handleLoadingRequest(loading: boolean) {
    this.loading = loading;
  }

  handleRefreshRequest() {
    this.refresh.next();
  }
}
