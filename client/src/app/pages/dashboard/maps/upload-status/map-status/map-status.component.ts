import {Component, Input, OnInit} from '@angular/core';
import {MomentumMap} from '../../../../../@core/models/momentum-map.model';
import {MapUploadStatus} from '../../../../../@core/models/map-upload-status.model';

@Component({
  selector: 'map-status',
  templateUrl: './map-status.component.html',
  styleUrls: ['./map-status.component.scss'],
})
export class MapStatusComponent implements OnInit {
  statusEnum = MapUploadStatus;
  @Input('map') map: MomentumMap = null;
  constructor() { }

  ngOnInit() {
  }
}
