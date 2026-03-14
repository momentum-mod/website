import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Gamemode, PagedResponse, RankEntry } from '@momentum/constants';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { AsyncPipe, NgClass } from '@angular/common';
import { MessageService } from 'primeng/api';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { RankingService } from '../../../services/data/ranking.service';
import { LocalUserService } from '../../../services/data/local-user.service';
import { GamemodeSelectComponent } from '../../../components/gamemode-select/gamemode-select.component';
import { SpinnerComponent } from '../../../components/spinner/spinner.component';
import { UserComponent } from '../../../components/user/user.component';
import { IconComponent } from '../../../icons/icon.component';
import { NumberWithCommasPipe } from '../../../pipes/number-with-commas.pipe';

@Component({
  selector: 'm-rankings',
  templateUrl: './rankings.component.html',
  imports: [
    GamemodeSelectComponent,
    SpinnerComponent,
    UserComponent,
    PaginatorModule,
    NumberWithCommasPipe,
    IconComponent,
    NgClass,
    AsyncPipe
  ]
})
export class RankingsComponent implements OnInit {
  private readonly rankingService = inject(RankingService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly localUserService = inject(LocalUserService);

  protected selectedGamemode: Gamemode = Gamemode.SURF;
  protected ranks: RankEntry[] = [];
  protected totalCount = 0;
  protected loading = false;
  protected skip = 0;
  protected readonly take = 10;

  protected isAroundMode = false;
  private filter: 'around' | undefined;

  private readonly load$ = new Subject<void>();

  ngOnInit() {
    this.load$
      .pipe(
        tap(() => (this.loading = true)),
        switchMap(() =>
          this.rankingService
            .getRanks(this.selectedGamemode, {
              skip: this.skip,
              take: this.take,
              filter: this.filter
            })
            .pipe(
              catchError((err: HttpErrorResponse) => {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error fetching rankings!',
                  detail: err.error?.message ?? err.message
                });
                this.loading = false;
                return EMPTY;
              })
            )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res: PagedResponse<RankEntry>) => {
        this.ranks = res.data;
        this.totalCount = res.totalCount;
        this.loading = false;
        // After an 'around' fetch the backend chose a different skip; read it
        // back from the first result so the paginator reflects the real offset.
        if (this.filter === 'around' && res.data.length > 0) {
          this.skip = res.data[0].rank - 1;
        }
        this.filter = undefined;
      });

    this.load$.next();
  }

  protected onGamemodeChange(gamemode: Gamemode): void {
    this.selectedGamemode = gamemode;
    this.skip = 0;
    this.isAroundMode = false;
    this.filter = undefined;
    this.load$.next();
  }

  protected onPageChange(event: PaginatorState): void {
    this.skip = event.first;
    this.isAroundMode = false;
    this.load$.next();
  }

  protected onAroundClick(): void {
    this.isAroundMode = true;
    this.filter = 'around';
    this.skip = 0;
    this.load$.next();
  }
}
