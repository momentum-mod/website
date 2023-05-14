import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

export interface UserSearch {
  alreadySelected: boolean;
}

export interface CreditChangeEvent {
  user: User;
  added: boolean;
  type: MapCreditType;
}

@Component({
  selector: 'mom-map-credit',
  templateUrl: './map-credit.component.html',
  styleUrls: ['./map-credit.component.scss']
})
export class MapCreditComponent {
  @Input() category: string;
  @Input() credType: MapCreditType;
  @Input() creditArr: User[][];
  @Input() editable: boolean;
  @Output() creditChange: EventEmitter<CreditChangeEvent>;
  userSearch: UserSearch;

  constructor() {
    this.creditChange = new EventEmitter<CreditChangeEvent>();
  }

  addUser(user: User) {
    // Check if in any category already
    let alreadySel = false;
    for (let cred = 0; cred < MapCreditType.LENGTH; cred++) {
      if (this.creditArr[cred].some((val) => val.id === user.id)) {
        alreadySel = true;
        break;
      }
    }
    if (alreadySel) {
      this.userSearch.alreadySelected = true;
    } else {
      this.creditArr[this.credType].push(user);
      this.creditChange.emit({
        type: this.credType,
        user: user,
        added: true
      });
      this.removeUserSearch();
    }
  }

  removeUser(user: User) {
    const indx = this.creditArr[this.credType].indexOf(user);
    if (indx > -1) {
      this.creditArr[this.credType].splice(indx, 1);
      this.creditChange.emit({
        type: this.credType,
        user: user,
        added: false
      });
    }
  }

  addUserSearch() {
    this.userSearch = {
      alreadySelected: false
    };
  }

  removeUserSearch() {
    delete this.userSearch;
  }

  drop(event: CdkDragDrop<User[]>) {
    if (this.editable) {
      moveItemInArray(
        this.creditArr[this.credType],
        event.previousIndex,
        event.currentIndex
      );
      this.creditChange.emit({
        type: this.credType,
        user: null,
        added: false
      });
    }
  }
}
