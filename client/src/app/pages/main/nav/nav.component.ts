import {Component, ElementRef, HostListener, ViewChild} from '@angular/core';

@Component({
  selector: 'ngx-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
})
export class NavComponent {

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (window.pageYOffset > 200) {
      this.mainNavClass = 'navbar-shrink';
    } else {
      this.mainNavClass = '';
    }
  }
  @ViewChild('mainNav') mainNav: ElementRef;
  mainNavClass: string;
  constructor() {
    this.mainNavClass = '';
  }
}
