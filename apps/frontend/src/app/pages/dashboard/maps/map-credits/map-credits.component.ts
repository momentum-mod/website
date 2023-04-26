import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../../../@core/models/user.model';
import { MapCreditType } from '../../../../@core/models/map-credit-type.model';
import { CreditChangeEvent } from './map-credit/map-credit.component';

@Component({
  selector: 'map-credits',
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
