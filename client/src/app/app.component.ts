/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from './@core/utils/analytics.service';
import {ScreenerService} from './@core/utils/screener.service';
import {ToasterConfig} from 'angular2-toaster';

@Component({
  selector: 'ngx-app',
  template: `
    <toaster-container [toasterconfig]="toasterConfig"></toaster-container>
    <router-outlet></router-outlet>`,
})
export class AppComponent implements OnInit {

  // Toaster config things
  readonly timeout: number = 2500; // in milliseconds
  readonly toasterConfig: ToasterConfig = new ToasterConfig({
    positionClass: 'toast-top-full-width',
    timeout: this.timeout,
    newestOnTop: true,
    tapToDismiss: true,
    preventDuplicates: true,
    animation: 'fade',
    limit: 5,
    showCloseButton: true,
  });
  constructor(private analytics: AnalyticsService,
              private screener: ScreenerService) {
    this.screener.inject();
  }

  ngOnInit(): void {
    this.analytics.trackPageViews();
  }
}
