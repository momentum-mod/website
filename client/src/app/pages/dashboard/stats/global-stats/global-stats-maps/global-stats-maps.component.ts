import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {EChartOption} from 'echarts';
import {GlobalMapStats} from '../../../../../@core/models/global-map-stats.model';

@Component({
  selector: 'global-stats-maps',
  templateUrl: './global-stats-maps.component.html',
  styleUrls: ['./global-stats-maps.component.scss'],
})
export class GlobalStatsMapsComponent implements OnInit, OnChanges {

  @Input('globalMapStats') globalMapStats: GlobalMapStats;

  mapCompletionPieChart;
  mapCompletionPieChartOptions: EChartOption;

  constructor() { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.globalMapStats.currentValue) {
      this.mapCompletionPieChartOptions = {
        legend: {
          orient: 'vertical',
          left: 'left',
          data: ['Completed', 'Not Completed'],
        },
        series: [{
          data: [
            { value: this.globalMapStats.totalCompletedMaps, name: 'Completed' },
            { value: this.globalMapStats.totalMaps - this.globalMapStats.totalCompletedMaps, name: 'Not Completed' },
          ],
          type: 'pie',
        }],
      };
    }
  }

  ngOnInit() {
  }

  onChartInit(chartInstance) {
    this.mapCompletionPieChart = chartInstance;
  }

}
