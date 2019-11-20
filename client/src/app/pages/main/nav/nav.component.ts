import {Component, ElementRef, HostListener, ViewChild} from '@angular/core';

@Component({
  selector: 'ngx-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
})
export class NavComponent {
  @HostListener('window:scroll', [])
  onWindowScroll() {
    window.pageYOffset > 200 ? this.mainNavClass = 'navbar-shrink' : this.mainNavClass = '';
  }

  @ViewChild('mainNav', {static: false})
  mainNav: ElementRef;
  mainNavClass: string = '';

  navbarOpen: boolean = false;
  toggleNavbar() {
    this.navbarOpen = !this.navbarOpen;
  }
}
