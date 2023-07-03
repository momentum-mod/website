/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
import { Component } from '@angular/core';
import { NbIconLibraries } from '@nebular/theme';
import { initIconPacks } from '@momentum/frontend/icons';

@Component({
  selector: 'mom-app',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent {
  constructor(private iconLibraries: NbIconLibraries) {
    initIconPacks(iconLibraries);
  }
}
