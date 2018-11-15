import {Component, OnInit} from '@angular/core';
import {EChartOption} from 'echarts';

@Component({
  selector: 'global-stats-maps',
  templateUrl: './global-stats-maps.component.html',
  styleUrls: ['./global-stats-maps.component.scss'],
})
export class GlobalStatsMapsComponent implements OnInit {
  chartOption: EChartOption = {
    legend: {
      orient: 'vertical',
      left: 'left',
      data: ['Completed', 'Not Completed'],
    },
    series: [{
      data: [
        { value: 400, name: 'Completed' },
        { value: 310, name: 'Not Completed' },
      ],
      type: 'pie',
    }],
  };
  constructor() { }
  ngOnInit() {
  }

}
