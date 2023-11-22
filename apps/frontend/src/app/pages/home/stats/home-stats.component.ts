import { Component, Input } from '@angular/core';
import { UserStats } from '@momentum/constants';
import { NbCardModule } from '@nebular/theme';

@Component({
  selector: 'mom-home-stats',
  templateUrl: './home-stats.component.html',
  styleUrls: ['./home-stats.component.scss'],
  standalone: true,
  imports: [NbCardModule]
})
export class HomeStatsComponent {
  @Input() userStats: UserStats;
}
