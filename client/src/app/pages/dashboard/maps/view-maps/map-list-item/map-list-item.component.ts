import {Component, Input, OnInit} from '@angular/core';
import {MomentumMap} from '../../../../../@core/models/momentum-map.model';

@Component({
  selector: 'map-list-item',
  templateUrl: './map-list-item.component.html',
  styleUrls: ['./map-list-item.component.scss'],
})
export class MapListItemComponent implements OnInit {

  @Input('map') map: MomentumMap;

  constructor() { }

  ngOnInit() {
  }

}
