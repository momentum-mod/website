import { Component, Input } from '@angular/core';
import { UserStats } from '@momentum/constants';
import { SharedModule } from '../../../shared.module';

@Component({
  selector: 'mom-home-stats',
  templateUrl: './home-stats.component.html',
  styleUrls: ['./home-stats.component.scss'],
  standalone: true,
  imports: [SharedModule]
})
export class HomeStatsComponent {
  @Input() userStats: UserStats;
}
