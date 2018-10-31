import {Component, Input} from '@angular/core';
import {User} from '../../../../@core/models/user.model';

@Component({
  selector: 'map-credits',
  templateUrl: './map-credits.component.html',
  styleUrls: ['./map-credits.component.scss'],
})
export class MapCreditsComponent {

  @Input('authors') authors: User[];
  @Input('testers') testers: User[];
  @Input('special-thanks') specialThanks: User[];
  constructor() {
  }
}
