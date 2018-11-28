import {Component, Input, OnInit} from '@angular/core';
import {MapCredit} from '../../../../../@core/models/map-credit.model';
import {Map_Credit_Type} from '../../../../../@core/models/map-credit-type.model';

@Component({
  selector: 'map-info-credits',
  templateUrl: './map-info-credits.component.html',
  styleUrls: ['./map-info-credits.component.scss'],
})
export class MapInfoCreditsComponent implements OnInit {

  @Input('map') map;
  Map_Credit_Type: typeof Map_Credit_Type = Map_Credit_Type;

  constructor() {}

  ngOnInit() {
  }

  filterMapCredits(mapCredits: MapCredit[], creditType: Map_Credit_Type): MapCredit[] {
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
