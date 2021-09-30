import { Component, OnInit, OnDestroy } from '@angular/core';
import {StatsStoreService} from '../../../../@core/data/stats/stats-store.service';
import {GlobalBaseStats} from '../../../../@core/models/global-base-stats.model';
import {GlobalMapStats} from '../../../../@core/models/global-map-stats.model';
import { map, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'global-stats',
  templateUrl: './global-stats.component.html',
  styleUrls: ['./global-stats.component.scss'],
})
export class GlobalStatsComponent implements OnInit, OnDestroy {

  destroy$ = new Subject();

  globalBaseStats: GlobalBaseStats;
  globalMapStats: GlobalMapStats;

  constructor(private statsService: StatsStoreService) { }

  ngOnInit() {
    this.statsService.baseStats$.pipe(
      takeUntil(this.destroy$),
      map((c) => {
        if(c) {
          this.globalBaseStats = c;
        } else {
          this.statsService.setGlobalBaseStats();
        }
      }),
    );
    this.statsService.mapStats$.pipe(
      takeUntil(this.destroy$),
      map((c) => {
        if(c) {
          this.globalMapStats = c;
        } else {
          this.statsService.setGlobalBaseStats();
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}

