/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
import { NgModule } from '@angular/core';

import { SearchComponent } from './search.component';
import { NbSearchService } from './search.service';
import {
  NbIconModule,
  NbOverlayModule,
  NbThemeModule,
  NbUserModule
} from '@nebular/theme';
import { SearchFieldComponent } from './search-field.component';
import { SearchResultsComponent } from './search-results.component';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [
    NbThemeModule,
    CommonModule,
    NbIconModule,
    NbUserModule,
    NbOverlayModule
  ],
  declarations: [SearchComponent, SearchFieldComponent, SearchResultsComponent],
  exports: [SearchComponent, SearchFieldComponent, SearchResultsComponent],
  providers: [NbSearchService]
})
export class NbSearchModule {}
