import {Component, ElementRef, ViewChild} from '@angular/core';
import {SmartTableComponent} from '../smart-table/smart-table.component';


@Component({
  selector: 'user-list',
  template: `<ngx-smart-table #table></ngx-smart-table>`,
})
export class UserListComponent {

  @ViewChild('table') smartTable: ElementRef<SmartTableComponent>;
  constructor() {
  }
}
