import {Component, ElementRef, HostListener, ViewChild} from '@angular/core';

@Component({
  selector: 'ngx-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
})
export class NavComponent {
  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.mainNavClass = window.pageYOffset > 200 ? 'navbar-shrink' : '';
  }

  @ViewChild('mainNav', {static: false}) mainNav: ElementRef;
  mainNavClass: string;
  constructor() {
    this.mainNavClass = '';
  }

  navbarOpen: boolean = false;
  toggleNavbar() {
    this.navbarOpen = !this.navbarOpen;
  }
}
