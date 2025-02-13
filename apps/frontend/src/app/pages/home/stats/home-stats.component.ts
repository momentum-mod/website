import { Component, Input } from '@angular/core';
import { UserStats } from '@momentum/constants';
import { CardComponent } from '../../../components/card/card.component';

@Component({
  selector: 'm-home-stats',
  imports: [CardComponent],
  templateUrl: './home-stats.component.html'
})
export class HomeStatsComponent {
  @Input() userStats: UserStats;
}
