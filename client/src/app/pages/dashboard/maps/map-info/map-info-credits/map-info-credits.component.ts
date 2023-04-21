import { Component, Input } from '@angular/core';
import { MapCredit } from '../../../../../@core/models/map-credit.model';
import { MapCreditType } from '../../../../../@core/models/map-credit-type.model';
import { MomentumMap } from '../../../../../@core/models/momentum-map.model';

@Component({
  selector: 'map-info-credits',
  templateUrl: './map-info-credits.component.html',
  styleUrls: ['./map-info-credits.component.scss']
})
export class MapInfoCreditsComponent {
  @Input() map: MomentumMap;
  Map_Credit_Type: typeof MapCreditType = MapCreditType;

  filterMapCredits(
    mapCredits: MapCredit[],
    creditType: MapCreditType
  ): MapCredit[] {
    if (!mapCredits) return [];
    const credits = [];
    for (const mapCredit of mapCredits) {
      if (mapCredit.type === creditType) credits.push(mapCredit);
    }
    return credits;
  }
}
