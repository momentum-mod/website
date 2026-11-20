import {
  Component,
  DestroyRef,
  OnChanges,
  inject,
  input,
  signal
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { MessageService } from '@openng/optimus-ui/api';
import { PaginatorModule, PaginatorState } from '@openng/optimus-ui/paginator';
import {
  CompletionGroup,
  Gamemode,
  GamemodeInfo,
  getCompletionGroup,
  getRankGroupEnds,
  LeaderboardRun,
  LeaderboardType,
  RANK_GROUP_TOP_RANKS,
  TrackType,
  TrackTypeName
} from '@momentum/constants';
import { UsersService } from '../../../services/data/users.service';
import { GamemodeSelectComponent } from '../../../components/gamemode-select/gamemode-select.component';
import { SpinnerDirective } from '../../../directives/spinner.directive';
import { NumberWithCommasPipe } from '../../../pipes/number-with-commas.pipe';
import { TimingPipe } from '../../../pipes/timing.pipe';
import { TimeAgoPipe } from '../../../pipes/time-ago.pipe';

/**
 * A user's leaderboard runs (PBs) on approved maps with rank, leaderboard size
 * and rank points.
 */
@Component({
  selector: 'm-profile-runs',
  templateUrl: './profile-runs.component.html',
  imports: [
    GamemodeSelectComponent,
    SpinnerDirective,
    PaginatorModule,
    NumberWithCommasPipe,
    TimingPipe,
    TimeAgoPipe,
    RouterLink,
    NgStyle
  ]
})
export class ProfileRunsComponent implements OnChanges {
  private readonly usersService = inject(UsersService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly GamemodeInfo = GamemodeInfo;

  readonly userID = input.required<number>();

  protected readonly gamemode = signal<Gamemode | null>(null);
  protected readonly rankedOnly = signal(true);
  /** Hide stage and bonus runs, which otherwise crowd out main tracks. */
  protected readonly mainOnly = signal(true);
  protected readonly runs = signal<LeaderboardRun[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(false);
  protected readonly skip = signal(0);
  protected readonly take = 10;

  private readonly load = new Subject<void>();

  constructor() {
    this.load
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(() =>
          this.usersService
            .getUserRuns(this.userID(), {
              gamemode: this.gamemode() ?? undefined,
              // Every RANKED leaderboard awards points: main tracks, stages
              // and bonuses.
              ...(this.rankedOnly() && {
                leaderboardType: LeaderboardType.RANKED
              }),
              ...(this.mainOnly() && { trackType: TrackType.MAIN }),
              skip: this.skip(),
              take: this.take
            })
            .pipe(
              catchError((error: HttpErrorResponse) => {
                this.loading.set(false);
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error fetching runs',
                  detail: error.error?.message
                });
                return EMPTY;
              })
            )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        this.runs.set(response.data);
        this.totalCount.set(response.totalCount);
        this.loading.set(false);
      });
  }

  ngOnChanges(): void {
    if (!this.userID()) return;
    this.skip.set(0);
    this.load.next();
  }

  protected setGamemode(gamemode: Gamemode | null): void {
    this.gamemode.set(gamemode);
    this.skip.set(0);
    this.load.next();
  }

  protected setRankedOnly(rankedOnly: boolean): void {
    if (rankedOnly === this.rankedOnly()) return;
    this.rankedOnly.set(rankedOnly);
    this.skip.set(0);
    this.load.next();
  }

  protected setMainOnly(mainOnly: boolean): void {
    if (mainOnly === this.mainOnly()) return;
    this.mainOnly.set(mainOnly);
    this.skip.set(0);
    this.load.next();
  }

  protected onPageChange(event: PaginatorState): void {
    this.skip.set(event.first);
    this.load.next();
  }

  /**
   * Where the run places on its leaderboard: WR, Top 10, or its cosmetic
   * percentile group, labelled like the game's group pills. `color` names the
   * --group-*-bg/-text CSS vars. Null below the last group.
   */
  protected rankGroup(
    run: LeaderboardRun
  ): { label: string; title: string; color: string } | null {
    if (run.rank === 1)
      return { label: 'WR', title: 'World record', color: 'wr' };
    if (run.rank <= RANK_GROUP_TOP_RANKS)
      return { label: 'TOP 10', title: 'Top 10', color: 'top10' };
    const group = run.totalRuns
      ? getCompletionGroup(run.rank, getRankGroupEnds(run.totalRuns))
      : null;
    if (group === null) return null;
    const groupNum = group - CompletionGroup.GROUP_1 + 1;
    return {
      label: `G${groupNum}`,
      title: `Group ${groupNum}`,
      color: `${groupNum}`
    };
  }

  protected trackName(run: LeaderboardRun): string | null {
    if (run.trackType === TrackType.MAIN) return null;
    return `${TrackTypeName.get(run.trackType)} ${run.trackNum}`;
  }
}
