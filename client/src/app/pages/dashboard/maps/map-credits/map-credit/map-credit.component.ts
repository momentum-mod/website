import {Component, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {User} from '../../../../../@core/models/user.model';
import {NbPopoverDirective} from '@nebular/theme';

@Component({
  selector: 'map-credit',
  templateUrl: './map-credit.component.html',
  styleUrls: ['./map-credit.component.scss'],
})
export class MapCreditComponent {

  @Input('category') category: string;
  @Input('categoryArr') categoryArray: User[];
  @Input('editable') editable: boolean;
  @ViewChild(NbPopoverDirective) popover;
  @Output() userAdded: EventEmitter<User>;
  @Output() userRemoved: EventEmitter<User>;
  alreadySelected: boolean;
  constructor() {
    this.alreadySelected = false;
    this.userAdded = new EventEmitter<User>();
    this.userRemoved = new EventEmitter<User>();
  }
  addUser(user: User) {
    if (this.categoryArray.find((val => val.id === user.id))) {
      this.alreadySelected = true;
    } else {
      this.alreadySelected = false;
      this.categoryArray.push(user);
      this.userAdded.emit(user);
      this.popover.hide();
    }
  }
  removeUser(user: User) {
    const indx = this.categoryArray.indexOf(user);
    if (indx > -1) {
      this.categoryArray.splice(indx, 1);
      this.userRemoved.emit(user);
    }
  }
}
