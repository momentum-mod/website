import {Component, EventEmitter, Input, Output} from '@angular/core';
import {User} from '../../../../../@core/models/user.model';

export interface UserSearch {
  alreadySelected: boolean;
}

@Component({
  selector: 'map-credit',
  templateUrl: './map-credit.component.html',
  styleUrls: ['./map-credit.component.scss'],
})
export class MapCreditComponent {

  @Input('category') category: string;
  @Input('categoryArr') categoryArray: User[];
  @Input('editable') editable: boolean;
  @Output() userAdded: EventEmitter<User>;
  @Output() userRemoved: EventEmitter<User>;
  userSearches: UserSearch[];
  constructor() {
    this.userAdded = new EventEmitter<User>();
    this.userRemoved = new EventEmitter<User>();
    this.userSearches = [];
  }
  addUser(user: User, userSearch: any) {
    if (this.categoryArray.find((val => val.id === user.id))) {
      userSearch.alreadySelected = true;
    } else {
      this.categoryArray.push(user);
      this.userAdded.emit(user);
      this.removeUserSearch(userSearch);
    }
  }
  removeUser(user: User) {
    const indx = this.categoryArray.indexOf(user);
    if (indx > -1) {
      this.categoryArray.splice(indx, 1);
      this.userRemoved.emit(user);
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
