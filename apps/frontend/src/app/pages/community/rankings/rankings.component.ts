import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AsyncPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import {
  Gamemode,
  GamemodeDefaultUIStyle,
  GamemodeStyles,
  RankEntry,
  Style,
  styleEnglishName
} from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { RankingService } from '../../../services/data/ranking.service';
import { LocalUserService } from '../../../services/data/local-user.service';
import { GamemodeSelectComponent } from '../../../components/gamemode-select/gamemode-select.component';
import { CardComponent } from '../../../components/card/card.component';
import { UserComponent } from '../../../components/user/user.component';
import { SpinnerDirective } from '../../../directives/spinner.directive';
import { NumberWithCommasPipe } from '../../../pipes/number-with-commas.pipe';

@Component({
  selector: 'm-rankings',
  templateUrl: './rankings.component.html',
  imports: [
    GamemodeSelectComponent,
    CardComponent,
    UserComponent,
    SpinnerDirective,
    PaginatorModule,
    SelectModule,
    FormsModule,
    NumberWithCommasPipe,
    NgClass,
    AsyncPipe
  ]
})
export class RankingsComponent implements OnInit {
  private readonly rankingService = inject(RankingService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly localUserService = inject(LocalUserService);

  protected gamemode: Gamemode = Gamemode.SURF;
  protected style: Style = Style.NORMAL;
  protected styleOptions: Array<{ label: string; value: Style }> = [];

  protected entries: RankEntry[] = [];
  protected totalCount = 0;
  protected loading = false;
  protected skip = 0;
  protected readonly take = 20;

  /** Set after "Jump to me" until the player navigates elsewhere. */
  protected aroundSelf = false;
  private jumpToSelf = false;

  private readonly load = new Subject<void>();
  private scrollToSelfAfterLoad = false;

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    const gamemode = Number(params.get('gamemode'));
    if (Enum.values(Gamemode).includes(gamemode)) {
      this.gamemode = gamemode;
    }
    this.updateStyleOptions();
    const style = Number(params.get('style'));
    if (this.styleOptions.some(({ value }) => value === style)) {
      this.style = style;
    }

    this.load
      .pipe(
        tap(() => (this.loading = true)),
        switchMap(() =>
          this.rankingService
            .getLadder(this.gamemode, {
              style: this.style,
              skip: this.skip,
              take: this.take,
              filter: this.jumpToSelf ? 'around' : undefined
            })
            .pipe(
              catchError((error: HttpErrorResponse) => {
                this.loading = false;
                this.jumpToSelf = false;
                this.messageService.add({
                  severity: 'error',
                  summary:
                    error.status === 410
                      ? 'You have no rank in this mode yet'
                      : 'Error fetching rankings',
                  detail:
                    error.status === 410 ? undefined : error.error?.message
                });
                return EMPTY;
              })
            )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        const jumped = this.jumpToSelf;
        this.jumpToSelf = false;

        if (jumped) {
          // 'around' centres on the player, which needn't line up with the
          // paginator's pages. Move to the page containing them instead.
          const self = response.data.find((entry) => this.isLocalUser(entry));
          if (self) {
            const pageSkip =
              Math.floor((self.rank - 1) / this.take) * this.take;
            if (pageSkip !== response.data[0].rank - 1) {
              this.skip = pageSkip;
              this.scrollToSelfAfterLoad = true;
              this.load.next();
              return;
            }
            this.skip = pageSkip;
          }
          this.scrollToSelfAfterLoad = true;
        }

        this.entries = response.data;
        this.totalCount = response.totalCount;
        this.loading = false;

        if (this.scrollToSelfAfterLoad) {
          this.scrollToSelfAfterLoad = false;
          // Wait a tick for the rows to render.
          setTimeout(() =>
            document
              .getElementById('rank-entry-self')
              ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
          );
        }
      });

    this.load.next();
  }

  protected setGamemode(gamemode: Gamemode): void {
    this.gamemode = gamemode;
    this.updateStyleOptions();
    this.style = GamemodeDefaultUIStyle.get(gamemode);
    this.reset();
  }

  protected setStyle(style: Style): void {
    this.style = style;
    this.reset();
  }

  protected onPageChange(event: PaginatorState): void {
    if (event.first === this.skip) return;
    this.skip = event.first;
    this.aroundSelf = false;
    this.load.next();
  }

  protected onJumpToSelf(): void {
    this.jumpToSelf = true;
    this.aroundSelf = true;
    this.load.next();
  }

  protected isLocalUser(entry: RankEntry): boolean {
    return this.localUserService.user.value?.id === entry.userID;
  }

  private reset(): void {
    this.skip = 0;
    this.aroundSelf = false;
    void this.router.navigate([], {
      queryParams: { gamemode: this.gamemode, style: this.style },
      replaceUrl: true
    });
    this.load.next();
  }

  private updateStyleOptions(): void {
    this.styleOptions = [...GamemodeStyles.get(this.gamemode)].map((value) => ({
      label: styleEnglishName(value),
      value
    }));
  }
}
