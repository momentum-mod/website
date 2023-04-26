import { Component, Input } from '@angular/core';
import { MomentumMap } from '../../../../../@core/models/momentum-map.model';

@Component({
  selector: 'map-info-stats',
  templateUrl: './map-info-stats.component.html',
  styleUrls: ['./map-info-stats.component.scss']
})
export class MapInfoStatsComponent {
  @Input() map: MomentumMap;
}
