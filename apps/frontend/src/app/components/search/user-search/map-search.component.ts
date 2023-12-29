import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MapsService } from '@momentum/frontend/data';
import { MMap } from '@momentum/constants';
import { NgClass, NgFor, NgIf, NgOptimizedImage } from '@angular/common';
import { IconComponent } from '@momentum/frontend/icons';
import { PaginatorModule } from 'primeng/paginator';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { AbstractSearchComponent } from './abstract-search.component';
import { SpinnerDirective } from '../../../directives/spinner.directive';

@Component({
  selector: 'm-map-search',
  templateUrl: './map-search.component.html',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    IconComponent,
    NgClass,
    NgFor,
    PaginatorModule,
    OverlayPanelModule,
    NgIf,
    NgOptimizedImage,
    SpinnerDirective
  ]
})
export class MapSearchComponent extends AbstractSearchComponent<MMap> {
  constructor(private readonly mapsService: MapsService) {
    super();
  }

  itemsName = 'maps';

  searchRequest(searchString: string) {
    return this.mapsService.getMaps({
      search: searchString,
      take: this.rows,
      skip: this.first,
      expand: ['thumbnail']
    });
  }
}
