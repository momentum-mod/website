import {Component} from '@angular/core';

@Component({
  selector: 'main-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {

  constructor() { }

  getYear() {
    return new Date().getFullYear();
  }
}
