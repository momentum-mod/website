import {Component, OnInit} from '@angular/core';
import {CookieService} from 'ngx-cookie-service';
import {NbToastrService} from '@nebular/theme';

@Component({
  selector: 'ngx-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss'],
})
export class MainPageComponent implements OnInit {

  constructor(private toasterService: NbToastrService,
              private cookieService: CookieService) {
  }
  ngOnInit(): void {
    if (this.cookieService.check('errMsg')) {
      this.toasterService.danger(this.cookieService.get('errMsg'), 'Error', {duration: 0});
      this.cookieService.delete('errMsg');
    }
  }
}
