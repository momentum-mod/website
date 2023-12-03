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

  // TODO: What the fuck
  goToHome() {
    this.menuService.navigateHome();
  }
}
