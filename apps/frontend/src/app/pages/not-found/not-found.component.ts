import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CardComponent } from '../../components/card/card.component';

@Component({
  selector: 'm-not-found',
  imports: [CardComponent],
  templateUrl: './not-found.component.html'
})
export class NotFoundComponent {
  constructor(protected readonly router: Router) {}
}
