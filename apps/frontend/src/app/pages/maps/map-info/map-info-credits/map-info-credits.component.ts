import { Component, Input } from '@angular/core';
import { MapCreditNames, MapCreditType } from '@momentum/constants';
import { MMap, MapCredit } from '@momentum/constants';
import { SharedModule } from '../../../../shared.module';

@Component({
  selector: 'mom-map-info-credits',
  templateUrl: './map-info-credits.component.html',
  standalone: true,
  imports: [SharedModule]
})
export class MapInfoCreditsComponent {
  @Input() map: MMap;
  protected readonly MapCreditType = MapCreditType;
  protected readonly MapCreditNames = MapCreditNames;

  filterMapCredits(
    mapCredits: MapCredit[],
    creditType: MapCreditType
  ): MapCredit[] {
    if (!mapCredits) return [];
    return mapCredits.filter((credit) => credit.type === creditType);
  }
}
