import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SharedModule } from '../../shared.module';

@Component({
  selector: 'm-not-found',
  templateUrl: './not-found.component.html',
  imports: [SharedModule]
})
export class NotFoundComponent {
  constructor(protected readonly router: Router) {}
}
