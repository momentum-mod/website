import { Component, Input, OnChanges, inject } from '@angular/core';
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

  @Input({ required: true }) userID: number;

  protected ranks: UserRank[] = [];
  protected loading = false;

  ngOnChanges(): void {
    if (!this.userID) return;

    this.loading = true;
    this.rankingService.getUserRanks(this.userID).subscribe({
      next: (ranks) => {
        this.ranks = ranks.sort((a, b) => a.rank - b.rank);
        this.loading = false;
      },
      error: () => {
        this.ranks = [];
        this.loading = false;
      }
    });
  }
}
