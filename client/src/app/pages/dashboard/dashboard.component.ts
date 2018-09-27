import { Component } from '@angular/core';
import {MENU_ITEMS} from './dashboard-menu';

@Component({
  selector: 'dashboard',
  template: `
    <ngx-sample-layout>
      <nb-menu [items]="menu"></nb-menu>
      <router-outlet></router-outlet>
    </ngx-sample-layout>
  `,
})
export class DashboardComponent {
  menu = MENU_ITEMS;
}
