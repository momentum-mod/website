import { Component } from '@angular/core';
import { MapListType } from '../map-list/map-list.component';

@Component({
  selector: 'mom-view-map-queue',
  template: `<nb-card>
    <nb-card-header><h2>BROWSE MAPS</h2></nb-card-header>
    <nb-card-body>
      <mom-map-list [type]="MapListType.BROWSE" />
    </nb-card-body>
  </nb-card>`
})
export class ViewMapsComponent {
  protected readonly MapListType = MapListType;
}
