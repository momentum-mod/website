import { NbMenuService } from '@nebular/theme';
import { Component } from '@angular/core';
import { SharedModule } from '../../shared.module';

@Component({
  selector: 'm-not-found',
  templateUrl: './not-found.component.html',
  standalone: true,
  imports: [SharedModule]
})
export class NotFoundComponent {
  constructor(private menuService: NbMenuService) {}

  goToHome() {
    this.menuService.navigateHome();
  }
}
