import { Component } from '@angular/core';

@Component({
  selector: 'ngx-profile-card',
  styleUrls: ['./profile-card.scss'],
  templateUrl: './profile-card.component.html',
})
export class ProfileCardComponent {

  flipped = false;

  toggleView() {
    this.flipped = !this.flipped;
  }
}
