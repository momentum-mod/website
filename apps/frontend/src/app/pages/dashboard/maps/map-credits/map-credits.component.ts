import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MapCreditType } from '@momentum/constants';
import { CreditChangeEvent } from './map-credit/map-credit.component';
import { MapCredit } from '@momentum/types';

@Component({
  selector: 'mom-map-credits',
  templateUrl: './map-credits.component.html',
  styleUrls: ['./map-credits.component.scss']
})
export class MapCreditsComponent {
  protected readonly MapCreditType = MapCreditType;
  @Input() credits: Record<MapCreditType, Partial<MapCredit>[]>;
  @Input() editable: boolean;
  @Output() creditChange: EventEmitter<CreditChangeEvent>;
  constructor() {
    this.credits = {
      [MapCreditType.AUTHOR]: [],
      [MapCreditType.COAUTHOR]: [],
      [MapCreditType.TESTER]: [],
      [MapCreditType.SPECIAL_THANKS]: []
    };
    this.editable = false;
    this.creditChange = new EventEmitter<CreditChangeEvent>();
  }
}
