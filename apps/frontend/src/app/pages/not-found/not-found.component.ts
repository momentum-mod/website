import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CardComponent } from '../../components/card/card.component';

@Component({
  selector: 'm-not-found',
  imports: [CardComponent],
  templateUrl: './not-found.component.html'
})
export class NotFoundComponent {
  protected readonly router = inject(Router);
}
