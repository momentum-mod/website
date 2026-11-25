import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { MessageService } from '@openng/optimus-ui/api';
import { PaginatorModule, PaginatorState } from '@openng/optimus-ui/paginator';
import { SelectModule } from '@openng/optimus-ui/select';
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
    NgClass
  ]
})
export class RankingsComponent implements OnInit {
  private readonly rankingService = inject(RankingService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly localUserService = inject(LocalUserService);

  protected readonly localUser = toSignal(this.localUserService.user);

  protected readonly gamemode = signal(Gamemode.SURF);
  protected readonly style = signal(Style.NORMAL);
  protected readonly styleOptions = signal<
    Array<{ label: string; value: Style }>
  >([]);

  protected readonly entries = signal<RankEntry[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(false);
  protected readonly skip = signal(0);
  protected readonly take = 20;

  /** Set after "Jump to me" until the player navigates elsewhere. */
  protected readonly aroundSelf = signal(false);
  private jumpToSelf = false;

  private readonly load = new Subject<void>();
  private scrollToSelfAfterLoad = false;

  constructor() {
    this.load
      .pipe(
        tap(() => this.loading.set(true)),
        switchMap(() =>
          this.rankingService
            .getLadder(this.gamemode(), {
              style: this.style(),
              skip: this.skip(),
              take: this.take,
              filter: this.jumpToSelf ? 'around' : undefined
            })
            .pipe(
              catchError((error: HttpErrorResponse) => {
                this.loading.set(false);
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
              this.skip.set(pageSkip);
              this.scrollToSelfAfterLoad = true;
              this.load.next();
              return;
            }
            this.skip.set(pageSkip);
          }
          this.scrollToSelfAfterLoad = true;
        }

        this.entries.set(response.data);
        this.totalCount.set(response.totalCount);
        this.loading.set(false);

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
  }

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    const gamemode = Number(params.get('gamemode'));
    if (Enum.values(Gamemode).includes(gamemode)) {
      this.gamemode.set(gamemode);
    }
    this.updateStyleOptions();
    const style = Number(params.get('style'));
    if (this.styleOptions().some(({ value }) => value === style)) {
      this.style.set(style);
    }

    this.load.next();
  }

  protected setGamemode(gamemode: Gamemode): void {
    this.gamemode.set(gamemode);
    this.updateStyleOptions();
    this.style.set(GamemodeDefaultUIStyle.get(gamemode));
    this.reset();
  }

  protected setStyle(style: Style): void {
    this.style.set(style);
    this.reset();
  }

  protected onPageChange(event: PaginatorState): void {
    if (event.first === this.skip()) return;
    this.skip.set(event.first);
    this.aroundSelf.set(false);
    this.load.next();
  }

  protected onJumpToSelf(): void {
    this.jumpToSelf = true;
    this.aroundSelf.set(true);
    this.load.next();
  }

  protected isLocalUser(entry: RankEntry): boolean {
    return this.localUser()?.id === entry.userID;
  }

  private reset(): void {
    this.skip.set(0);
    this.aroundSelf.set(false);
    void this.router.navigate([], {
      queryParams: { gamemode: this.gamemode(), style: this.style() },
      replaceUrl: true
    });
    this.load.next();
  }

  private updateStyleOptions(): void {
    this.styleOptions.set(
      [...GamemodeStyles.get(this.gamemode())].map((value) => ({
        label: styleEnglishName(value),
        value
      }))
    );
  }
}
