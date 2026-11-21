import { Component, OnChanges, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  GamemodeInfo,
  Style,
  styleEnglishName,
  UserRank
} from '@momentum/constants';
import { RankingService } from '../../../services/data/ranking.service';
import { SpinnerDirective } from '../../../directives/spinner.directive';
import { NumberWithCommasPipe } from '../../../pipes/number-with-commas.pipe';

/**
 * A user's position on every rank points ladder they have points on.
 */
@Component({
  selector: 'm-profile-ranks',
  templateUrl: './profile-ranks.component.html',
  imports: [RouterLink, SpinnerDirective, NumberWithCommasPipe]
})
export class ProfileRanksComponent implements OnChanges {
  private readonly rankingService = inject(RankingService);

  protected readonly GamemodeInfo = GamemodeInfo;
  protected readonly Style = Style;
  protected readonly styleEnglishName = styleEnglishName;

  readonly userID = input.required<number>();

  protected readonly ranks = signal<UserRank[]>([]);
  protected readonly loading = signal(false);

  ngOnChanges(): void {
    const userID = this.userID();
    if (!userID) return;

    this.loading.set(true);
    this.rankingService.getUserRanks(userID).subscribe({
      next: (ranks) => {
        this.ranks.set(ranks.sort((a, b) => a.rank - b.rank));
        this.loading.set(false);
      },
      error: () => {
        this.ranks.set([]);
        this.loading.set(false);
      }
    });
  }
}
