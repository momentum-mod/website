import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges
} from '@angular/core';
import {
  BehaviorSubject,
  merge,
  Observable,
  Subject,
  filter,
  switchMap,
  tap
} from 'rxjs';
import {
  ActivityType,
  Activity,
  PagedResponse,
  User
} from '@momentum/constants';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { MessageService } from 'primeng/api';
import { ActivityContentComponent } from './activity-content.component';
import { ActivityService } from '../../services/data/activity.service';
import { LocalUserService } from '../../services/data/local-user.service';
import { HttpErrorResponse } from '@angular/common/http';
import { SpinnerDirective } from '../../directives/spinner.directive';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../card/card.component';
import { NgStyle } from '@angular/common';

@Component({
  selector: 'm-activity',
  templateUrl: './activity.component.html',
  imports: [
    SelectModule,
    FormsModule,
    CardComponent,
    ActivityContentComponent,
    InfiniteScrollDirective,
    SpinnerDirective,
    NgStyle
  ]
})
export class ActivityComponent implements OnInit, OnChanges {
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
  private readonly typeChange = new Subject<void>();

  constructor(
    private readonly activityService: ActivityService,
    private readonly localUserService: LocalUserService,
    private readonly messageService: MessageService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activityFetchType']) this.typeChange.next();
  }

  ngOnInit() {
    this.typeChange
      .pipe(
        switchMap(() => {
          let fetchFn: () => Observable<PagedResponse<Activity>>;
          let extraListener: Observable<any>;

          const skipTake = () => ({
            skip: this.page++ * this.ITEMS_PER_PAGE,
            take: this.ITEMS_PER_PAGE
          });

          switch (this.activityFetchType) {
            case 'follow':
              fetchFn = () =>
                this.activityService.getFollowedActivity(skipTake());
              break;
            case 'all':
              fetchFn = () =>
                this.activityService.getRecentActivity(skipTake());
              break;
            case 'own':
              fetchFn = () =>
                this.activityService.getLocalUserActivity(skipTake());
              // Whenever LU updates, reset the component and refresh.
              extraListener = this.localUserService.user.pipe(filter(Boolean));
              break;
            default: // Generic BehaviorSubject variant.
              fetchFn = () => {
                return this.activityService.getUserActivity(
                  (this.activityFetchType as BehaviorSubject<User>).getValue()
                    .id,
                  skipTake()
                );
              };
              extraListener = this.activityFetchType;
              break;
          }

          this.clearActivities();
          this.loading = false;

          // Switch over component variants to pick type of request. infinite scrolly
          // guy will fire off the `load` subject on scroll
          return (
            extraListener
              ? merge(
                  this.load,
                  extraListener.pipe(
                    tap(() => {
                      this.clearActivities();
                      this.loading = false;
                    })
                  )
                )
              : this.load
          ).pipe(
            filter(() => this.canLoadMore),
            tap(() => (this.loading = true)),
            switchMap(() => fetchFn()),
            tap(() => (this.loading = false))
          );
        })
      )
      .subscribe({
        next: (res: PagedResponse<Activity>) => {
          this.canLoadMore = res.returnCount === this.ITEMS_PER_PAGE;
          if (res.returnCount === 0) return;
          this.activities.push(...res.data);
          this.filterActivities();
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error fetching activities!',
            detail: httpError.error.message
          });
          this.page = Math.max(0, this.page - 1);
        }
      });

    this.typeChange.next();
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
    this.filteredActivities = [];
    this.canLoadMore = true;
    this.page = 0;
  }
}
