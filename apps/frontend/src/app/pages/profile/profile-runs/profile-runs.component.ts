import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import {
  Gamemode,
  LeaderboardRun,
  LeaderboardType,
  PagedResponse,
  Style,
  TrackType
} from '@momentum/constants';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { NgClass, NgStyle } from '@angular/common';
import { MessageService } from 'primeng/api';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { RouterLink } from '@angular/router';
import { UsersService } from '../../../services/data/users.service';
import { GamemodeSelectComponent } from '../../../components/gamemode-select/gamemode-select.component';
import { SpinnerComponent } from '../../../components/spinner/spinner.component';
import { NumberWithCommasPipe } from '../../../pipes/number-with-commas.pipe';

// rankXP is planned but currently commented out on LeaderboardRun in constants.
// Extend the type locally until it's formally added to the shared model.
type UserRun = LeaderboardRun & { rankXP?: number };

@Component({
  selector: 'm-profile-runs',
  templateUrl: './profile-runs.component.html',
  imports: [
    GamemodeSelectComponent,
    SpinnerComponent,
    PaginatorModule,
    NumberWithCommasPipe,
    RouterLink,
    NgClass,
    NgStyle
  ]
})
export class ProfileRunsComponent implements OnInit {
  @Input({ required: true }) userID: number;

  private readonly usersService = inject(UsersService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected selectedGamemode: Gamemode = Gamemode.SURF;
  protected runs: UserRun[] = [];
  protected totalCount = 0;
  protected loading = false;
  protected hasLoaded = false;
  protected showUnranked = false;
  protected skip = 0;
  protected readonly take = 10;

  private readonly load$ = new Subject<void>();

  ngOnInit() {
    this.load$
      .pipe(
        tap(() => (this.loading = true)),
        switchMap(() =>
          this.usersService
            .getUserRuns(this.userID, {
              gamemode: this.selectedGamemode,
              skip: this.skip,
              take: this.take,
              leaderboardType: this.showUnranked
                ? undefined
                : LeaderboardType.RANKED,
              trackType: TrackType.MAIN,
              style: Style.NORMAL
            })
            .pipe(
              catchError((err: HttpErrorResponse) => {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error fetching runs!',
                  detail: err.error?.message ?? err.message
                });
                this.loading = false;
                return EMPTY;
              })
            )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res: PagedResponse<UserRun>) => {
        this.runs = res.data;
        this.totalCount = res.totalCount;
        this.loading = false;
        this.hasLoaded = true;
      });

    this.load$.next();
  }

  protected onGamemodeChange(gamemode: Gamemode): void {
    this.selectedGamemode = gamemode;
    this.skip = 0;
    this.load$.next();
  }

  protected onToggleUnranked(): void {
    this.showUnranked = !this.showUnranked;
    this.skip = 0;
    this.load$.next();
  }

  protected onPageChange(event: PaginatorState): void {
    this.skip = event.first;
    this.load$.next();
  }

  protected getTier(run: UserRun): number | null {
    return (
      run.leaderboard?.tier ??
      run.map?.leaderboards?.find(
        (lb) =>
          lb.gamemode === run.gamemode &&
          lb.trackType === run.trackType &&
          lb.trackNum === run.trackNum
      )?.tier ??
      null
    );
  }
}
