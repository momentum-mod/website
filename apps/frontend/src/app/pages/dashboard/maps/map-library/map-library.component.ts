import { Component } from '@angular/core';
import { MapListType } from '../map-list/map-list.component';

@Component({
  selector: 'mom-map-library',
  template: ` <nb-card>
    <nb-card-header><h2>MY LIBRARY</h2></nb-card-header>
    <nb-card-body>
      <mom-map-list [type]="MapListType.LIBRARY"/>
    </nb-card-body>
  </nb-card>`
})
export class MapLibraryComponent {
  protected readonly MapListType = MapListType;
}
