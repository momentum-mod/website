import { Component } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { Router } from '@angular/router';

@Component({
  selector: 'm-not-found',
  templateUrl: './not-found.component.html',
  standalone: true,
  imports: [SharedModule]
})
export class NotFoundComponent {
  constructor(protected readonly router: Router) {}
}
