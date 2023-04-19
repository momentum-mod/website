import { Component, Input, OnInit } from '@angular/core';
import { GlobalBaseStats } from '../../../../../@core/models/global-base-stats.model';
import { GlobalMapStats } from '../../../../../@core/models/global-map-stats.model';

@Component({
  selector: 'global-stats-base',
  templateUrl: './global-stats-base.component.html',
  styleUrls: ['./global-stats-base.component.scss']
})
export class GlobalStatsBaseComponent implements OnInit {
  @Input('globalBaseStats') globalBaseStats: GlobalBaseStats;
  @Input('globalMapStats') globalMapStats: GlobalMapStats;

  constructor() {}

  ngOnInit() {}
}
