/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
import { NgModule } from '@angular/core';

import { SearchComponent } from './search.component';
import {
  NbIconModule,
  NbOverlayModule,
  NbThemeModule,
  NbUserModule
} from '@nebular/theme';
import { SearchFieldComponent } from './search-field.component';
import { SearchResultsComponent } from './search-results.component';
import { CommonModule, NgOptimizedImage } from '@angular/common';

@NgModule({
  imports: [
    NbThemeModule,
    CommonModule,
    NbIconModule,
    NbUserModule,
    NbOverlayModule,
    NgOptimizedImage
  ],
  declarations: [SearchComponent, SearchFieldComponent, SearchResultsComponent],
  exports: [SearchComponent, SearchFieldComponent, SearchResultsComponent]
})
export class NbSearchModule {}
