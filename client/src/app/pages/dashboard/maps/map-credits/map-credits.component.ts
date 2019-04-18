import {Component, EventEmitter, Input, Output} from '@angular/core';
import {User} from '../../../../@core/models/user.model';

export interface UserCreditChangeEvent {
  user: User;
  added: boolean;
}

@Component({
  selector: 'map-credits',
  templateUrl: './map-credits.component.html',
  styleUrls: ['./map-credits.component.scss'],
})
export class MapCreditsComponent {

  @Input('authors') authors: User[];
  @Input('coauthors') coauthors: User[];
  @Input('testers') testers: User[];
  @Input('special-thanks') specialThanks: User[];
  @Input('editable') editable: boolean;
  @Output() testerChange: EventEmitter<UserCreditChangeEvent>;
  @Output() coauthorChange: EventEmitter<UserCreditChangeEvent>;
  @Output() authorChange: EventEmitter<UserCreditChangeEvent>;
  @Output() specialThanksChange: EventEmitter<UserCreditChangeEvent>;
  constructor() {
    this.authors = [];
    this.coauthors = [];
    this.testers = [];
    this.specialThanks = [];
    this.editable = false;
    this.authorChange = new EventEmitter<UserCreditChangeEvent>();
    this.coauthorChange = new EventEmitter<UserCreditChangeEvent>();
    this.testerChange = new EventEmitter<UserCreditChangeEvent>();
    this.specialThanksChange = new EventEmitter<UserCreditChangeEvent>();
  }
}
