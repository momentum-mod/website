import { Component } from '@angular/core';

@Component({
  selector: 'mom-view-map-queue',
  template: `<nb-card>
    <nb-card-header><h2>Browse Maps</h2></nb-card-header>
    <nb-card-body>
      <mom-map-list [isUpload]="false" />
    </nb-card-body>
  </nb-card>`
})
export class ViewMapsComponent {}
