import {Component, Input, OnInit} from '@angular/core';
import {MomentumMap} from '../../../../../@core/models/momentum-map.model';

@Component({
  selector: 'map-info-stats',
  templateUrl: './map-info-stats.component.html',
  styleUrls: ['./map-info-stats.component.scss'],
})
export class MapInfoStatsComponent implements OnInit {

  @Input('map') map: MomentumMap;

  constructor() { }

  ngOnInit() {
  }

}
