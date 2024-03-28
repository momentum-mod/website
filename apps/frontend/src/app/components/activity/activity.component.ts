import { Component, Input, OnInit } from '@angular/core';
import { BehaviorSubject, merge, Observable, Subject } from 'rxjs';
import {
  ActivityType,
  Activity,
  PagedResponse,
  User
} from '@momentum/constants';
import { DropdownModule } from 'primeng/dropdown';
import { filter, mergeMap, tap } from 'rxjs/operators';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { MessageService } from 'primeng/api';
import { ActivityContentComponent } from './activity-content.component';
import { SharedModule } from '../../shared.module';
import { ActivityService } from '../../services/data/activity.service';
import { LocalUserService } from '../../services/data/local-user.service';

@Component({
  selector: 'm-activity',
  templateUrl: './activity.component.html',
  standalone: true,
  imports: [
    SharedModule,
    DropdownModule,
    ActivityContentComponent,
    InfiniteScrollModule
  ]
})
export class ActivityComponent implements OnInit {
  protected readonly Types = [
    { value: ActivityType.ALL, label: 'All' },
    { value: ActivityType.MAP_APPROVED, label: 'Maps Only' },
    { value: ActivityType.PB_ACHIEVED, label: 'PBs Only' },
    { value: ActivityType.WR_ACHIEVED, label: 'WRs Only' }
  ];

  @Input() headerTitle = 'Activity';

  /**
   * The type of activity to fetch, either:
   *  follow: Activities of all users the LU follows
   *  own: The LU's own activities. Always use this for the logged-in-user,
   *       don't pass a BehaviorSubject, else it'll use the wrong endpoint.
   *  all: BehaviorSubject<User> of a different user
   */
  @Input({ required: true }) activityFetchType!:
    | 'follow'
    | 'all'
    | 'own'
    | BehaviorSubject<User>;

  /**
   * The height of the activities list, needs to be a precise value due to
   * infinite-scroll behaviour.
   */
  @Input() height = '24rem';

  // Filtered version always gets rendered, but this is needed to store other
  // activities hidden by filters, so we don't need to reset and reload data
  // each time a filter changes.
  protected activities: Activity[] = [];
  protected filteredActivities: Activity[] = [];

  protected filterValue: ActivityType = ActivityType.ALL;
  private page = 0;
  private readonly ITEMS_PER_PAGE = 20;
  protected canLoadMore = true;
  protected loading: boolean;

  // Emits on first load, and whenever p-scroller wants new data
  protected readonly load = new Subject<void>();

  constructor(
    private readonly activityService: ActivityService,
    private readonly localUserService: LocalUserService,
    private readonly messageService: MessageService
  ) {}

  ngOnInit(): void {
    let fetchFn: (...args: any[]) => Observable<PagedResponse<Activity>>;
    let extraListener: Observable<any>;
    let extraFetchArg: any;

    switch (this.activityFetchType) {
      case 'follow':
        fetchFn = (...args) =>
          this.activityService.getFollowedActivity(...args);
        break;
      case 'all':
        fetchFn = (...args) => this.activityService.getRecentActivity(...args);
        break;
      case 'own':
        fetchFn = (...args) =>
          this.activityService.getLocalUserActivity(...args);
        // Whenever LU updates, reset the component and refresh.
        extraListener = this.localUserService.user.pipe(
          filter(Boolean),
          tap(() => this.clearActivities())
        );
        break;
      default: // Generic BehaviorSubject variant.
        fetchFn = (...args: [any, any]) =>
          this.activityService.getUserActivity(...args);
        extraFetchArg = (
          this.activityFetchType as BehaviorSubject<User>
        ).getValue().id;
        extraListener = this.activityFetchType.pipe(
          tap(() => this.clearActivities())
        );
        break;
    }

    const skipTake = () => ({
      skip: this.page++ * this.ITEMS_PER_PAGE,
      take: this.ITEMS_PER_PAGE
    });

    // Switch over component variants to pick type of request. infinite scrolly
    // guy will fire off the `load` subject on scroll
    (extraListener ? merge(this.load, extraListener) : this.load)
      .pipe(
        filter(() => this.canLoadMore && !this.loading),
        tap(() => (this.loading = true)),
        mergeMap(() =>
          extraFetchArg
            ? fetchFn(extraFetchArg, skipTake())
            : fetchFn(skipTake())
        ),
        tap(() => (this.loading = false))
      )
      .subscribe({
        next: (res: PagedResponse<Activity>) => {
          this.canLoadMore = res.returnCount === this.ITEMS_PER_PAGE;
          if (res.returnCount === 0) return;
          this.activities.push(...res.data);
          this.filterActivities();
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error fetching activities!',
            detail: err.message
          });
          this.page = Math.max(0, this.page - 1);
        }
      });

    if (this.localUserService.isLoggedIn) {
      this.load.next();
    }
  }

  protected filterActivities(): void {
    this.filteredActivities =
      this.filterValue === ActivityType.ALL
        ? this.activities
        : this.activities.filter((value) => value.type === this.filterValue);
  }

  private clearActivities() {
    this.activities = [];
    this.canLoadMore = true;
    this.page = 0;
  }
}
