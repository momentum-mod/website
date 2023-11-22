import { NbMenuService, NbCardModule, NbButtonModule } from '@nebular/theme';
import { Component } from '@angular/core';

@Component({
  selector: 'mom-not-found',
  templateUrl: './not-found.component.html',
  standalone: true,
  imports: [NbCardModule, NbButtonModule]
})
export class NotFoundComponent {
  constructor(private menuService: NbMenuService) {}

  goToHome() {
    this.menuService.navigateHome();
  }
}
