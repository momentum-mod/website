import { Component } from '@angular/core';
import { MapListComponent } from '../map-list/map-list.component';
import { NbCardModule } from '@nebular/theme';

@Component({
  selector: 'mom-view-map-queue',
  template: `<nb-card>
    <nb-card-header><h2>Browse Maps</h2></nb-card-header>
    <nb-card-body>
      <mom-map-list [isUpload]="false" />
    </nb-card-body>
  </nb-card>`,
  standalone: true,
  imports: [NbCardModule, MapListComponent]
})
export class ViewMapsComponent {}
