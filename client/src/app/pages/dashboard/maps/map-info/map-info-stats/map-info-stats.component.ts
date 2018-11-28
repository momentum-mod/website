import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'map-info-stats',
  templateUrl: './map-info-stats.component.html',
  styleUrls: ['./map-info-stats.component.scss'],
})
export class MapInfoStatsComponent implements OnInit {

  @Input('map') map;

  constructor() { }

  ngOnInit() {
  }

}
