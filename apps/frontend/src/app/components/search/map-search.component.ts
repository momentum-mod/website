import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { AbstractSearchComponent } from './abstract-search.component';
import { MMap } from '@momentum/constants';
import { SharedModule } from '../../shared.module';
import { MapsService } from '../../services/data/maps.service';

@Component({
  selector: 'm-map-search',
  templateUrl: './map-search.component.html',
  standalone: true,
  imports: [SharedModule, PaginatorModule, OverlayPanelModule, NgOptimizedImage]
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
