import { Component } from '@angular/core';
import { MapListType } from '../map-list/map-list.component';

@Component({
  selector: 'map-favorites',
  template: ` <nb-card>
    <nb-card-header><h2>FAVORITE MAPS</h2></nb-card-header>
    <nb-card-body>
      <map-list [type]="MapListType.FAVORITES"></map-list>
    </nb-card-body>
  </nb-card>`
})
export class MapFavoritesComponent {
  protected readonly MapListType = MapListType;
}
