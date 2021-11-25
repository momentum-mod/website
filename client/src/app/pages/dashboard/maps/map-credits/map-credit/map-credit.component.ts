import {Component, EventEmitter, Input, Output} from '@angular/core';
import {User} from '../../../../../@core/models/user.model';
import {MapCreditType} from '../../../../../@core/models/map-credit-type.model';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import { MapUploadStatus } from '../../../../../@core/models/map-upload-status.model';

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
  @Input('statusFlag') statusFlag: number|MapUploadStatus;
  @Input('isAdmin') isAdmin: boolean;
  @Output() creditChange: EventEmitter<CreditChangeEvent>;
  userSearch: UserSearch;
  disableDeleteCredit: boolean;

  constructor() {
    this.creditChange = new EventEmitter<CreditChangeEvent>();
  }

  ngOnInit() {
    this.disableDeleteCredit = !this.isAdmin && (this.statusFlag===MapUploadStatus.APPROVED);
  }

  addUser(user: User) {
    // Check if in any category already
    let alreadySel = false;
    for (let cred = 0; cred < MapCreditType.LENGTH; cred++) {
      if (this.creditArr[cred].find(val => val.id === user.id)) {
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
        added: true,
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
        added: false,
      });
    }
  }

  addUserSearch() {
    this.userSearch = {
      alreadySelected: false,
    };
  }

  removeUserSearch() {
    delete this.userSearch;
  }

  drop(event: CdkDragDrop<User[]>) {
    if (this.editable) {
      moveItemInArray(this.creditArr[this.credType], event.previousIndex, event.currentIndex);
      this.creditChange.emit({
        type: this.credType,
        user: null,
        added: false,
      });
    }
  }
}
