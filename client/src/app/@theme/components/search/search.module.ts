/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
import { NgModule } from '@angular/core';

import { SearchComponent } from './search.component';
import { NbSearchService } from './search.service';
import {NbSharedModule} from '@nebular/theme/components/shared/shared.module';
import {NbOverlayModule, NbThemeModule, NbUserModule} from '@nebular/theme';
import {SearchFieldComponent} from './search-field.component';
import {SearchResultsComponent} from './search-results.component';

@NgModule({
  imports: [
    NbThemeModule,
    NbUserModule,
    NbSharedModule,
    NbOverlayModule,
  ],
  declarations: [
    SearchComponent,
    SearchFieldComponent,
    SearchResultsComponent,
  ],
  exports: [
    SearchComponent,
    SearchFieldComponent,
    SearchResultsComponent,
  ],
  providers: [
    NbSearchService,
  ],
  entryComponents: [
    SearchFieldComponent,
  ],
})
export class NbSearchModule {
}
