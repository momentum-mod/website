import { Component } from '@angular/core';

@Component({
  selector: 'ngx-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  showAboutVideo: boolean;
  constructor() {
    this.showAboutVideo = false;
  }
}
