import { Component, Input } from '@angular/core';
import { MapCreditType } from '@momentum/constants';
import { Map, MapCredit } from '@momentum/constants';

@Component({
  selector: 'mom-map-info-credits',
  templateUrl: './map-info-credits.component.html',
  styleUrls: ['./map-info-credits.component.scss']
})
export class MapInfoCreditsComponent {
  @Input() map: Map;
  protected readonly MapCreditType = MapCreditType;

  filterMapCredits(
    mapCredits: MapCredit[],
    creditType: MapCreditType
  ): MapCredit[] {
    if (!mapCredits) return [];
    return mapCredits.filter((credit) => credit.type === creditType);
  }
}
