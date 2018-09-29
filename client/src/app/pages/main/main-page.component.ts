import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';

@Component({
  selector: 'ngx-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.css'],
})
export class MainPageComponent implements OnInit {

  @ViewChild('mainNav') mainNav: ElementRef;
  mainNavClass: string;

  navBarCollapse(): void {
    if (this.mainNav.nativeElement.getBoundingClientRect().top > 100) {
      this.mainNavClass = 'navbar-shrink';
    } else {
      this.mainNavClass = '';
    }
  }
  ngOnInit(): void {
    this.navBarCollapse();

    /*// Smooth scrolling using jQuery easing
    jqr('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function() {
      if (location.pathname.replace(/^\//, '') ===
        this.pathname.replace(/^\//, '') && location.hostname === this.hostname) {
        let target = jqr(this.hash);
        target = target.length ? target : jqr('[name=' + this.hash.slice(1) + ']');
        if (target.length) {
          jqr('html, body').animate({
            scrollTop: (target.offset().top - 70),
          }, 1000, 'easeInOutExpo');
          return false;
        }
      }
    });

    // Closes responsive menu when a scroll trigger link is clicked
    jqr('.js-scroll-trigger').click(function() {
      jqr('.navbar-collapse').collapse('hide');
    });

    // Activate scrollspy to add active class to navbar items on scroll
    jqr('body').scrollspy({
      target: '#mainNav',
      offset: 100,
    });*/
  }
}
