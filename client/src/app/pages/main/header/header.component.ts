import {Component, OnInit} from '@angular/core';
import {NbDialogService} from '@nebular/theme';
import {ConfirmDialogComponent} from '../../../@theme/components/confirm-dialog/confirm-dialog.component';
import {Router} from '@angular/router';

@Component({
  selector: 'main-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {

  isLoggedIn: boolean;
  constructor(private dialogService: NbDialogService,
              private routerService: Router) {
    this.isLoggedIn = false;
  }

  ngOnInit(): void {
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
}
