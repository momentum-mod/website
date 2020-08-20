import {Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {ConfirmDialogComponent} from '../../../@theme/components/confirm-dialog/confirm-dialog.component';
import {NbDialogService} from '@nebular/theme';
import {Router} from '@angular/router';

@Component({
  selector: 'ngx-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
})
export class NavComponent implements OnInit {
  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.mainNavClass = window.pageYOffset > 200 ? 'navbar-shrink' : '';
  }

  @ViewChild('mainNav', {static: false})
  mainNav: ElementRef;
  mainNavClass: string;
  navbarOpen: boolean;

  isLoggedIn: boolean;

  constructor(private dialogService: NbDialogService,
              private routerService: Router) {
    this.mainNavClass = '';
    this.navbarOpen = false;
    this.isLoggedIn = false;
  }

  toggleNavbar() {
    this.navbarOpen = !this.navbarOpen;
  }

  ngOnInit() {
    if (localStorage.getItem('user')) {
      this.isLoggedIn = true;
    }
  }

  showPrivateAlphaWarning(): void {
    this.dialogService.open(ConfirmDialogComponent, {
      context: {
        title: 'Important Note!',
        message: 'Momentum Mod is currently in a private Alpha until its public 1.0.0 release.\n\n' +
          'Logging into the site works for everyone, but the features found on it will only' +
          ' serve a purpose for those with a key.\n\n' +
          'Keys are given to those who help contribute to the game, so consider ' +
          'joining the discord and letting the team know if you can help!\n\n' +
          'Do you understand and want to proceed?',
      },
    }).onClose.subscribe((agree) => {
      if (agree) {
        this.routerService.navigate(['/dashboard']);
      }
    });
  }

  scrollTo(elementID:string): boolean {
    switch(elementID){
      case 'about':
      case 'gamemodes':
      case 'footer':
        document.getElementById(`${elementID}`).scrollIntoView();
        break;
      default:
        console.log("Unexpected Navigation Location");
    }
    return false;
  }
}
