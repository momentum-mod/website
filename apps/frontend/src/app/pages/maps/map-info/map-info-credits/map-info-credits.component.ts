import { Component, Input } from '@angular/core';
import { MapCreditNames, MapCreditType } from '@momentum/constants';
import { MMap, MapCredit } from '@momentum/constants';
import { SharedModule } from '../../../../shared.module';
import { AvatarComponent } from '../../../../components/avatar/avatar.component';

@Component({
  selector: 'm-map-info-credits',
  templateUrl: './map-info-credits.component.html',
  standalone: true,
  imports: [SharedModule, AvatarComponent]
})
export class MapInfoCreditsComponent {
  protected readonly MapCreditType = MapCreditType;
  protected readonly MapCreditNames = MapCreditNames;

  @Input() map: MMap;

  filterMapCredits(
    mapCredits: MapCredit[],
    creditType: MapCreditType
  ): MapCredit[] {
    if (!mapCredits) return [];
    return mapCredits.filter((credit) => credit.type === creditType);
  }
}
