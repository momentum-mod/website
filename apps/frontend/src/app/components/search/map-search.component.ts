import { Component, inject } from '@angular/core';
import { PaginatorModule } from 'primeng/paginator';
import { AbstractSearchComponent } from './abstract-search.component';
import { MMap } from '@momentum/constants';

import { MapsService } from '../../services/data/maps.service';
import { SpinnerDirective } from '../../directives/spinner.directive';
import { ReactiveFormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'm-map-search',
  templateUrl: './map-search.component.html',
  imports: [PaginatorModule, SpinnerDirective, ReactiveFormsModule, NgClass]
})
export class MapSearchComponent extends AbstractSearchComponent<MMap> {
  private readonly mapsService = inject(MapsService);

  protected selectedIdx = 0;

  itemsName = 'maps';

  searchRequest(searchString: string) {
    return this.mapsService.getMaps({
      search: searchString,
      take: this.rows,
      skip: this.first
    });
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIdx = (this.selectedIdx + 1) % this.found.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIdx =
        (this.selectedIdx - 1 + this.found.length) % this.found.length;
    } else if (event.key === 'Enter' && this.found.length > 0) {
      this.onSelected(this.found[this.selectedIdx]);
    }
  }
}
