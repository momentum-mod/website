import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MapsService } from '@momentum/frontend/data';
import { MMap } from '@momentum/constants';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgClass, NgFor, NgIf, NgOptimizedImage } from '@angular/common';
import { IconComponent } from '@momentum/frontend/icons';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { AbstractSearchComponent } from './abstract-search.component';

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
    NgxPaginationModule,
    TooltipModule,
    PaginatorModule,
    OverlayPanelModule,
    NgIf,
    NgOptimizedImage
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
