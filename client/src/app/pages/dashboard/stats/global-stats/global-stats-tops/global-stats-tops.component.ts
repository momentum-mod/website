import {Component, Input, OnInit, OnChanges} from '@angular/core';
import {GlobalMapStats} from '../../../../../@core/models/global-map-stats.model';

@Component({
  selector: 'global-stats-tops',
  templateUrl: './global-stats-tops.component.html',
  styleUrls: ['./global-stats-tops.component.scss'],
})
export class GlobalStatsTopsComponent implements OnInit, OnChanges {

  @Input('globalMapStats') globalMapStats: GlobalMapStats;

  loading: boolean;

  constructor() {
    this.loading = true;
  }

  ngOnInit() {
  }

  ngOnChanges() {
    if (this.globalMapStats) {
      this.loading = false;
    }
  }

}
