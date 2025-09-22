import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import {
  Notification,
  NotificationsDeleteQuery,
  NotificationType
} from '@momentum/constants';
import { NotificationsService } from '../../services/data/notifications.service';
import { merge, Subject, switchMap, take, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { AnnouncementNotificationComponent } from './types/announcement-notification.component';
import { MapStatusChangeNotificationComponent } from './types/map-status-change-notification.component';
import { MapTestingInviteNotificationComponent } from './types/map-testing-invite-notification.component';
import { MapReviewPostedNotificationComponent } from './types/map-review-posted-notification.component';
import { MapReviewCommentPostedNotificationComponent } from './types/map-review-comment-posted-notification.component';

@Component({
  selector: 'm-notifications-menu',
  imports: [
    PaginatorModule,
    AnnouncementNotificationComponent,
    MapStatusChangeNotificationComponent,
    MapTestingInviteNotificationComponent,
    MapReviewPostedNotificationComponent,
    MapReviewCommentPostedNotificationComponent
  ],
  templateUrl: 'notifications-menu.component.html',
  styles: `
    :host {
      display: flex;
    }
  `
})
export class NotificationsMenuComponent implements OnChanges, OnInit {
  private readonly notificationsService = inject(NotificationsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly NotificationType = NotificationType;

  protected notifications: Notification[] = [];

  // If set to true, all shown notifications will be marked as read
  // (even if the menu is in a hidden popover).
  @Input() markingAsReadEnabled = false;
  private _lastTotalUnreadCount = 0;
  @Output() unreadNotificationsCount = new EventEmitter<number>();

  protected first = 0;
  protected rows = 10;
  protected totalExisting = 0;
  protected readonly pageChange = new Subject<PaginatorState>();
  protected readonly refresh = new Subject<void>();

  protected loading = false;

  ngOnChanges(changes: SimpleChanges) {
    // We still need to call this if set to false, to run output emitter
    // for the first time. Refer to comment on function for more info.
    if (changes['markingAsReadEnabled'])
      this.markVisiblePageAsRead(this._lastTotalUnreadCount);
  }

  ngOnInit() {
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

          this.totalExisting = pagedResponse.totalCount;
          this.markVisiblePageAsRead(pagedResponse.totalUnreadCount);

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
    const queryOptions: NotificationsDeleteQuery =
      removeIndex !== undefined
        ? { notificationIDs: [this.notifications[removeIndex].id] }
        : { all: true };

    this.notificationsService
      .deleteNotifications(queryOptions)
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
   * This gets called in 3 different cases.
   * Firstly when fetching notifications from backend has finished.
   * If markingAsReadEnabled, we mark all visible notifications
   * (current page in paginator) as read locally, saving a request to the backend,
   * and preventing a loop should the backend return a different notifications order.
   *
   * The second case is where the parent component sets markingAsReadEnabled = true,
   * where similar logic as above follows.
   * The third case is when setting markingAsReadEnabled = false.
   * Here, we just early return, but still need to emit a totalUnreadCount value
   * to cover the case if it's the first time it is getting set (to guarantee an output value).
   *
   * As we don't fetch notifications in case 2 and 3, we don't have a totalUnreadCount
   * response value, so we store the last gotten value when case 1 runs, and use that.
   */
  markVisiblePageAsRead(totalUnreadCount: number) {
    const shownUnreadNotificationIDs = this.notifications
      .filter((notification) => !notification.isRead)
      .map((notification) => notification.id);

    if (!this.markingAsReadEnabled || shownUnreadNotificationIDs.length === 0) {
      this._lastTotalUnreadCount = totalUnreadCount;
      this.unreadNotificationsCount.emit(totalUnreadCount);
      return;
    }

    this.notificationsService
      .markNotificationsAsRead({ notificationIDs: shownUnreadNotificationIDs })
      .pipe(take(1))
      .subscribe(() => {
        // Don't refetch notifications (they will be the same other than isRead.)
        // Just modify locally.
        this.notifications.forEach((notification) => {
          if (!notification.isRead) notification.isRead = true;
        });
        const newTotalUnreadCount =
          totalUnreadCount - shownUnreadNotificationIDs.length;

        this._lastTotalUnreadCount = newTotalUnreadCount;
        this.unreadNotificationsCount.emit(newTotalUnreadCount);
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
