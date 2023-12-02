import { Component, Input } from '@angular/core';
import { UserStats } from '@momentum/constants';
import { SharedModule } from '../../../shared.module';
import { PageHeaderComponent } from '../../../components/page-header.component';

@Component({
  selector: 'm-home-stats',
  templateUrl: './home-stats.component.html',
  standalone: true,
  imports: [SharedModule, PageHeaderComponent]
})
export class HomeStatsComponent {
  @Input() userStats: UserStats;
}
