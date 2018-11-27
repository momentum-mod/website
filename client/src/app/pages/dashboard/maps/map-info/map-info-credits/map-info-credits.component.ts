import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'map-info-credits',
  templateUrl: './map-info-credits.component.html',
  styleUrls: ['./map-info-credits.component.scss'],
})
export class MapInfoCreditsComponent implements OnInit {
  @Input('map') map;

  constructor() { }

  ngOnInit() {
  }

}
