import { Component, inject } from '@angular/core';
import { PaginatorModule } from 'primeng/paginator';
import { AbstractSearchComponent } from './abstract-search.component';
import { MMap } from '@momentum/constants';

import { MapsService } from '../../services/data/maps.service';
import { SpinnerDirective } from '../../directives/spinner.directive';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'm-map-search',
  templateUrl: './map-search.component.html',
  imports: [PaginatorModule, SpinnerDirective, ReactiveFormsModule]
})
export class MapSearchComponent extends AbstractSearchComponent<MMap> {
  private readonly mapsService = inject(MapsService);

  itemsName = 'maps';

  searchRequest(searchString: string) {
    return this.mapsService.getMaps({
      search: searchString,
      take: this.rows,
      skip: this.first
    });
  }
}
