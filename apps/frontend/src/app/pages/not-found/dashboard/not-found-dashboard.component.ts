import { NbMenuService } from '@nebular/theme';
import { Component } from '@angular/core';

@Component({
  selector: 'mom-not-found-dashboard',
  styleUrls: ['./not-found-dashboard.component.scss'],
  templateUrl: './not-found-dashboard.component.html'
})
export class NotFoundDashboardComponent {
  constructor(private menuService: NbMenuService) {}

  goToHome() {
    this.menuService.navigateHome();
  }
}
