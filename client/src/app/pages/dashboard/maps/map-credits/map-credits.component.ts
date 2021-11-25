import {Component, EventEmitter, Input, Output} from '@angular/core';
import {User} from '../../../../@core/models/user.model';
import {MapCreditType} from '../../../../@core/models/map-credit-type.model';
import {CreditChangeEvent} from './map-credit/map-credit.component';
import { MapUploadStatus } from '../../../../@core/models/map-upload-status.model';

@Component({
  selector: 'map-credits',
  templateUrl: './map-credits.component.html',
  styleUrls: ['./map-credits.component.scss'],
})
export class MapCreditsComponent {

  creditType: typeof MapCreditType = MapCreditType;
  @Input('creditArr') creditArr: User[][];
  @Input('editable') editable: boolean;
  @Input('statusFlag') statusFlag: number|MapUploadStatus;
  @Input('isAdmin') isAdmin: boolean;
  @Output() creditChange: EventEmitter<CreditChangeEvent>;
  constructor() {
    this.creditArr = [];
    this.editable = false;
    this.creditChange = new EventEmitter<CreditChangeEvent>();
  }
}
