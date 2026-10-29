import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
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
import { MessageService } from 'primeng/api';
import { UsersService } from '../../services/data/users.service';
import { HttpErrorResponse } from '@angular/common/http';
import { SpinnerDirective } from '../../directives/spinner.directive';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../card/card.component';
import { NgStyle, DatePipe } from '@angular/common';
import { AvatarComponent } from '../avatar/avatar.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'm-follow',
  templateUrl: './follow.component.html',
  imports: [
    SelectModule,
    FormsModule,
    CardComponent,
    InfiniteScrollDirective,
    SpinnerDirective,
    NgStyle,
    RouterLink,
    DatePipe,
    AvatarComponent
  ]
})
export class FollowComponent implements OnInit, OnChanges {
  private readonly usersService = inject(UsersService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) userSubject!: BehaviorSubject<User>;

  /**
   * The follow type to fetch, either:
   * follower: Followers of the user.
   * following: The users the LU is following.
   */
  @Input({ required: true }) followFetchType!: 'follower' | 'following';

  private readonly ITEMS_PER_PAGE = 20;

  protected follows: Follow[] = [];
  protected followCount = 0;

  private page = 0;
  protected canLoadMore = true;
  protected loading = false;
  protected initialized = false;

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

          switch (this.followFetchType) {
            case 'follower':
              fetchFn = () =>
                this.usersService.getFollowersOfUser(
                  this.userSubject.getValue(),
                  skipTake()
                );
              break;
            case 'following':
              fetchFn = () =>
                this.usersService.getUserFollows(
                  this.userSubject.getValue(),
                  skipTake()
                );
              break;
          }

          this.clearFollows();
          this.loading = false;

          return merge(
            this.load,
            this.userSubject.pipe(
              filter((user): user is User => !!user),
              tap(() => {
                this.clearFollows();
                this.loading = false;
              })
            )
          ).pipe(
            filter(() => this.canLoadMore && !this.loading),
            tap(() => (this.loading = true)),
            switchMap(() => fetchFn())
          );
        })
      )
      .subscribe({
        next: (res: PagedResponse<Follow>) => {
          this.canLoadMore = res.returnCount === this.ITEMS_PER_PAGE;
          this.followCount = res.totalCount;

          if (res.returnCount !== 0) {
            this.follows.push(...res.data);
          }
          this.loading = false;
        },
        error: (httpError: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error fetching follows!',
            detail: httpError.error.message
          });
          this.page = Math.max(0, this.page - 1);
          this.loading = false;
        }
      });
    this.typeChange.next();
  }

  private clearFollows(): void {
    this.follows = [];
    this.followCount = 0;
    this.page = 0;
    this.canLoadMore = true;
    this.loading = false;
  }

  public refresh(): void {
    this.typeChange.next();
  }
}
