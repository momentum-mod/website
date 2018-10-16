/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
import { NgModule } from '@angular/core';

import { NbSearchComponent, NbSearchFieldComponent } from './search.component';
import { NbSearchService } from './search.service';
import {NbSharedModule} from '@nebular/theme/components/shared/shared.module';
import {NbOverlayModule, NbThemeModule} from '@nebular/theme';

@NgModule({
  imports: [
    NbThemeModule,
    NbSharedModule,
    NbOverlayModule,
  ],
  declarations: [
    NbSearchComponent,
    NbSearchFieldComponent,
  ],
  exports: [
    NbSearchComponent,
    NbSearchFieldComponent,
  ],
  providers: [
    NbSearchService,
  ],
  entryComponents: [
    NbSearchFieldComponent,
  ],
})
export class NbSearchModule {
}
