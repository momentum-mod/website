import {Component, Input, OnInit} from '@angular/core';
import {MapCredit} from '../../../../../@core/models/map-credit.model';
import {MapCreditType} from '../../../../../@core/models/map-credit-type.model';

@Component({
  selector: 'map-info-credits',
  templateUrl: './map-info-credits.component.html',
  styleUrls: ['./map-info-credits.component.scss'],
})
export class MapInfoCreditsComponent implements OnInit {

  @Input('map') map;
  Map_Credit_Type: typeof MapCreditType = MapCreditType;

  constructor() {}

  ngOnInit() {
  }

  filterMapCredits(mapCredits: MapCredit[], creditType: MapCreditType): MapCredit[] {
    if (!mapCredits)
      return [];
    const credits = [];
    for (let i = 0; i < mapCredits.length; i++) {
      if (mapCredits[i].type === creditType)
        credits.push(mapCredits[i]);
    }
    return credits;
  }

}
