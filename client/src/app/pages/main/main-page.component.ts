import {Component, OnInit} from '@angular/core';
import {Toast, ToasterService} from 'angular2-toaster';
import {CookieService} from 'ngx-cookie-service';

@Component({
  selector: 'ngx-main-page',
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.scss'],
})
export class MainPageComponent implements OnInit {

  constructor(private toasterService: ToasterService,
              private cookieService: CookieService) {
  }
  ngOnInit(): void {
    if (this.cookieService.check('errMsg')) {
      const toast: Toast = {
        type: 'error',
        title: 'Error',
        body: this.cookieService.get('errMsg'),
        timeout: 0,
      };
      this.toasterService.pop(toast);
      this.cookieService.delete('errMsg');
    }
  }
}
