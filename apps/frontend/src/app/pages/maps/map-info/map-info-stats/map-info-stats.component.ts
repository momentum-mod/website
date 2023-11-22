import { Component, Input } from '@angular/core';
import { MMap } from '@momentum/constants';

@Component({
  selector: 'mom-map-info-stats',
  templateUrl: './map-info-stats.component.html',
  styleUrls: ['./map-info-stats.component.scss'],
  standalone: true
})
export class MapInfoStatsComponent {
  @Input() map: MMap;
}
