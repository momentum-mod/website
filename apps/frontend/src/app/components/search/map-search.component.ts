import { Component, inject, signal } from '@angular/core';
import { PaginatorModule } from '@openng/optimus-ui/paginator';
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

  protected readonly selectedIdx = signal(0);

  itemsName = 'maps';

  searchRequest(searchString: string) {
    return this.mapsService.getMaps({
      search: searchString,
      take: this.rows,
      skip: this.first()
    });
  }

  onKeydown(event: KeyboardEvent) {
    const found = this.found();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIdx.update((idx) => (idx + 1) % found.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIdx.update((idx) => (idx - 1 + found.length) % found.length);
    } else if (event.key === 'Enter' && found.length > 0) {
      this.onSelected(found[this.selectedIdx()]);
    }
  }
}
