import { Component } from '@angular/core';
import { MapListComponent } from '../map-list/map-list.component';
import { NbCardModule } from '@nebular/theme';
import { PageHeaderComponent } from '../../../components/page-header.component';

@Component({
  selector: 'mom-view-map-queue',
  template: `
    <mom-page-header title="Browse Maps" />
    <div class="card">
      <mom-map-list [isUpload]="false" />
    </div>
  `,
  standalone: true,
  imports: [NbCardModule, MapListComponent, PageHeaderComponent]
})
export class ViewMapsComponent {}
