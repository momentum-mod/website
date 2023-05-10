import { Component, OnInit } from '@angular/core';
import { StatsService } from '../../../../@core/data/stats.service';
import { GlobalBaseStats } from '../../../../@core/models/global-base-stats.model';
import { GlobalMapStats } from '../../../../@core/models/global-map-stats.model';

@Component({
  selector: 'mom-global-stats',
  templateUrl: './global-stats.component.html',
  styleUrls: ['./global-stats.component.scss']
})
export class GlobalStatsComponent implements OnInit {
  globalBaseStats: GlobalBaseStats;
  globalMapStats: GlobalMapStats;

  constructor(private statsService: StatsService) {}

  ngOnInit() {
    this.loadGlobalBaseStats();
    this.loadGlobalMapStats();
  }

  loadGlobalBaseStats() {
    this.statsService.getGlobalBaseStats().subscribe({
      next: (baseStats) => (this.globalBaseStats = baseStats),
      error: (error) => console.error(error)
    });
  }

  loadGlobalMapStats() {
    this.statsService.getGlobalMapStats().subscribe({
      next: (mapStats) => (this.globalMapStats = mapStats),
      error: (error) => console.error(error)
    });
  }
}
