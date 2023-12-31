import { Component, Input } from '@angular/core';
import { UserStats } from '@momentum/constants';
import { SharedModule } from '../../../shared.module';
import { CardHeaderComponent } from '../../../components';

@Component({
  selector: 'm-home-stats',
  templateUrl: './home-stats.component.html',
  standalone: true,
  imports: [SharedModule, CardHeaderComponent]
})
export class HomeStatsComponent {
  @Input() userStats: UserStats;
}
