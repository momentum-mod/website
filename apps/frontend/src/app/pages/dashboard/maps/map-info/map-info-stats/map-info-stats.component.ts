import { Component, Input } from '@angular/core';
import { Map } from '@momentum/types';

@Component({
  selector: 'mom-map-info-stats',
  templateUrl: './map-info-stats.component.html',
  styleUrls: ['./map-info-stats.component.scss']
})
export class MapInfoStatsComponent {
  @Input() map: Map;
}
