import {Component, EventEmitter, Input, Output} from '@angular/core';
import {User} from '../../../../../@core/models/user.model';
import {MapCreditType} from '../../../../../@core/models/map-credit-type.model';

export interface UserSearch {
  alreadySelected: boolean;
}

export interface CreditChangeEvent {
  user: User;
  added: boolean;
  type: MapCreditType;
}

@Component({
  selector: 'map-credit',
  templateUrl: './map-credit.component.html',
  styleUrls: ['./map-credit.component.scss'],
})
export class MapCreditComponent {

  @Input('category') category: string;
  @Input('credType') credType: MapCreditType;
  @Input('creditArr') creditArr: User[][];
  @Input('editable') editable: boolean;
  @Output() creditChange: EventEmitter<CreditChangeEvent>;
  userSearches: UserSearch[];

  constructor() {
    this.creditChange = new EventEmitter<CreditChangeEvent>();
    this.userSearches = [];
  }

  addUser(user: User, userSearch: any) {
    // Check if in any category already
    let alreadySel = false;
    for (let cred = 0; cred < MapCreditType.LENGTH; cred++) {
      if (this.creditArr[cred].find(val => val.id === user.id)) {
        alreadySel = true;
        break;
      }
    }
    if (alreadySel) {
      userSearch.alreadySelected = true;
    } else {
      this.creditArr[this.credType].push(user);
      this.creditChange.emit({
        type: this.credType,
        user: user,
        added: true,
      });
      this.removeUserSearch(userSearch);
    }
  }

  removeUser(user: User) {
    const indx = this.creditArr[this.credType].indexOf(user);
    if (indx > -1) {
      this.creditArr[this.credType].splice(indx, 1);
      this.creditChange.emit({
        type: this.credType,
        user: user,
        added: false,
      });
    }
  }

  addUserSearch() {
    this.userSearches.push({
      alreadySelected: false,
    });
  }

  removeUserSearch(userSearch: any) {
    const index = this.userSearches.indexOf(userSearch, 0);
    if (index > -1) {
      this.userSearches.splice(index, 1);
    }
  }
}
