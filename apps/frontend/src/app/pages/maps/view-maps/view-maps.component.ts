import { Component } from '@angular/core';
import { MapListComponent } from '../map-list/map-list.component';
import { SharedModule } from '../../../shared.module';

@Component({
  selector: 'm-view-map-queue',
  template: `
    <m-card title="Browse Maps" titleSize="6">
      <m-map-list [isUpload]="false" />
    </m-card>
  `,
  standalone: true,
  imports: [SharedModule, MapListComponent]
})
export class ViewMapsComponent {}
