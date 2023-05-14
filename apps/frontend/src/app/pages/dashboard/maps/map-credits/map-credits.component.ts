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
  creditType: typeof MapCreditType = MapCreditType;
  @Input() creditArr: User[][];
  @Input() editable: boolean;
  @Output() creditChange: EventEmitter<CreditChangeEvent>;
  constructor() {
    this.creditArr = [];
    this.editable = false;
    this.creditChange = new EventEmitter<CreditChangeEvent>();
  }
}
