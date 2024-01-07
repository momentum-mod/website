import { Component, Input } from '@angular/core';
import { UserStats } from '@momentum/constants';

@Component({
  selector: 'mom-home-stats',
  templateUrl: './home-stats.component.html',
  styleUrls: ['./home-stats.component.scss']
})
export class HomeStatsComponent {
  @Input() userStats: UserStats;
}
