/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
import { Component } from '@angular/core';
import { NbIconLibraries } from '@nebular/theme';
import { kebabCase } from 'lodash-es';
import {
  MaterialDesignIcons,
  MomentumIcons,
  SimpleIcons
} from '@momentum/frontend/icons';

@Component({
  selector: 'mom-app',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent {
  constructor(private iconLibraries: NbIconLibraries) {
    this.initIconPacks();
  }

  initIconPacks(): void {
    const packs: [string, any][] = [
      ['si', SimpleIcons],
      ['mdi', MaterialDesignIcons],
      ['mom', MomentumIcons]
    ];
    for (const [packName, icons] of packs)
      this.iconLibraries.registerSvgPack(
        packName,
        Object.fromEntries(
          Object.entries(icons).map(([iconName, path]) => [
            kebabCase(
              packName === 'mdi' ? iconName.replace(/^mdi/, '') : iconName
            ),
            `<svg viewBox="0 0 24 24"><path fill="#fff" d="${path}"></path></svg>`
          ])
        )
      );
  }
}
