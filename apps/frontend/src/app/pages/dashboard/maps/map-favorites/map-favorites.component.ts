import { Component } from '@angular/core';
import { MapListType } from '../map-list/map-list.component';

@Component({
  selector: 'mom-map-favorites',
  template: ` <nb-card>
    <nb-card-header><h2>Favorite Maps</h2></nb-card-header>
    <nb-card-body>
      <mom-map-list [type]="MapListType.FAVORITES" />
    </nb-card-body>
  </nb-card>`
})
export class MapFavoritesComponent {
  protected readonly MapListType = MapListType;
}
