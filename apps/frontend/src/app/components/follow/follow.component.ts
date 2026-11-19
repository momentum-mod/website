import {
  Component,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
  input,
  signal,
  DestroyRef
} from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subject,
  filter,
  switchMap,
  tap,
  merge
} from 'rxjs';
import { PagedResponse, User, Follow } from '@momentum/constants';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { MessageService } from '@openng/optimus-ui/api';
import { UsersService } from '../../services/data/users.service';
import { HttpErrorResponse } from '@angular/common/http';
import { SpinnerDirective } from '../../directives/spinner.directive';
import { DatePipe } from '@angular/common';
import { AvatarComponent } from '../avatar/avatar.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'm-follow',
  templateUrl: './follow.component.html',
  imports: [
    InfiniteScrollDirective,
    SpinnerDirective,
    RouterLink,
    DatePipe,
    AvatarComponent
  ]
})
export class FollowComponent implements OnInit, OnChanges {
  private readonly usersService = inject(UsersService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly userSubject = input.required<BehaviorSubject<User>>();

  /**
   * The follow type to fetch, either:
   * follower: Followers of the user.
   * following: The users the LU is following.
   */
  readonly followFetchType = input.required<'follower' | 'following'>();

  private readonly ITEMS_PER_PAGE = 20;

  protected readonly follows = signal<Follow[]>([]);
  protected readonly followCount = signal(0);

  private page = 0;
  private canLoadMore = true;
  protected readonly loading = signal(false);

  // Emits on first load, and whenever p-scroller wants new data
  protected readonly load = new Subject<void>();
  private readonly typeChange = new Subject<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['followFetchType'] || changes['userSubject']) {
      this.typeChange.next();
    }
  }

  ngOnInit(): void {
    this.typeChange
      .pipe(
        switchMap(() => {
          let fetchFn: () => Observable<PagedResponse<Follow>>;

          const skipTake = () => ({
            skip: this.page++ * this.ITEMS_PER_PAGE,
            take: this.ITEMS_PER_PAGE
          });

          switch (this.followFetchType()) {
            case 'follower':
              fetchFn = () =>
                this.usersService.getFollowersOfUser(
                  this.userSubject().getValue(),
                  skipTake()
                );
              break;
            case 'following':
              fetchFn = () =>
                this.usersService.getUserFollows(
                  this.userSubject().getValue(),
                  skipTake()
                );
              break;
          }

          this.clearFollows();

          return merge(
            this.load,
            this.userSubject().pipe(
              filter((user): user is User => !!user),
              tap(() => this.clearFollows())
            )
          ).pipe(
            filter(() => this.canLoadMore && !this.loading()),
            tap(() => this.loading.set(true)),
            switchMap(() => fetchFn())
          );
        })
      )
      .subscribe({
        next: (res: PagedResponse<Follow>) => {
          this.canLoadMore = res.returnCount === this.ITEMS_PER_PAGE;
          this.followCount.set(res.totalCount);

          if (res.returnCount !== 0) {
            this.follows.update((follows) => [...follows, ...res.data]);
          }
          this.loading.set(false);
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error fetching follows!',
            detail: httpError.error.message
          });
          this.page = Math.max(0, this.page - 1);
          this.loading.set(false);
        }
      });
    this.typeChange.next();
  }

  private clearFollows(): void {
    this.follows.set([]);
    this.followCount.set(0);
    this.page = 0;
    this.canLoadMore = true;
    this.loading.set(false);
  }

  public refresh(): void {
    this.typeChange.next();
  }
}
