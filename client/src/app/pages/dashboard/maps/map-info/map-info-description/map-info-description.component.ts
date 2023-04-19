import { Component, Input, OnInit } from '@angular/core';
import { MomentumMap } from '../../../../../@core/models/momentum-map.model';

@Component({
  selector: 'map-info-description',
  templateUrl: './map-info-description.component.html',
  styleUrls: ['./map-info-description.component.scss']
})
export class MapInfoDescriptionComponent implements OnInit {
  @Input('map') map: MomentumMap;

  constructor() {}

  ngOnInit() {}
}
