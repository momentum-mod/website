import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {User} from '../../../../../@core/models/user.model';
import {NbPopoverDirective} from '@nebular/theme';

@Component({
  selector: 'map-credit',
  templateUrl: './map-credit.component.html',
  styleUrls: ['./map-credit.component.scss'],
})
export class MapCreditComponent implements OnInit {

  @Input('category') category: string;
  @Input('categoryArr') categoryArray: User[];
  @Input('editable') editable: boolean;
  @ViewChild(NbPopoverDirective) popover;
  alreadySelected: boolean;
  constructor() {
    this.alreadySelected = false;
  }

  ngOnInit() {
  }
  addUser(user: User) {
    if (this.categoryArray.find((val => val.id === user.id))) {
      this.alreadySelected = true;
    } else {
      this.alreadySelected = false;
      this.categoryArray.push(user);
      this.popover.hide();
    }
  }
  removeUser(user: User) {
    const indx = this.categoryArray.indexOf(user);
    if (indx > -1) {
      this.categoryArray.splice(indx, 1);
    }
  }
}
