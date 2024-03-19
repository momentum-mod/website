import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgClass, NgOptimizedImage } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { IconComponent } from '../../icons';
import { MapsService } from '../../services';
import { SpinnerDirective } from '../../directives';
import { AbstractSearchComponent } from './abstract-search.component';
import { MMap } from '@momentum/constants';

@Component({
  selector: 'm-map-search',
  templateUrl: './map-search.component.html',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    IconComponent,
    NgClass,
    PaginatorModule,
    OverlayPanelModule,
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
      skip: this.first
    });
  }
}
