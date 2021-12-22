import {Component, Input, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {EChartsOption} from 'echarts';
import {GlobalMapStats} from '../../../../../@core/models/global-map-stats.model';

@Component({
  selector: 'global-stats-maps',
  templateUrl: './global-stats-maps.component.html',
  styleUrls: ['./global-stats-maps.component.scss'],
})
export class GlobalStatsMapsComponent implements OnInit, OnChanges {

  @Input('globalMapStats') globalMapStats: GlobalMapStats;

  loading: boolean;
  mapCompletionPieChart;
  mapCompletionPieChartOptions: EChartsOption;

  constructor() {
    this.loading = true;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.globalMapStats) {
      this.loading = false;
    }
    if (changes.globalMapStats.currentValue) {
      this.mapCompletionPieChartOptions = {
        legend: {
          orient: 'vertical',
          left: 'left',
          data: ['Completed', 'Not Completed'],
          textStyle: {
            color: '#fff',
          },
        },
        series: [
          {
            data: [
              {
                value: this.globalMapStats.totalCompletedMaps,
                name: 'Completed',
                label: {
                  color: '#fff',
                },
              },
              {
                value: this.globalMapStats.totalMaps - this.globalMapStats.totalCompletedMaps,
                name: 'Not Completed',
                label: {
                  color: '#fff',
                },
              },
            ],
            type: 'pie',
          },
        ],
      };
    }
  }

  ngOnInit() {
  }

  onChartInit(chartInstance) {
    this.mapCompletionPieChart = chartInstance;
  }

}
