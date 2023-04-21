import { Component } from '@angular/core';
import { MapListType } from '../map-list/map-list.component';

@Component({
  selector: 'app-map-queue',
  templateUrl: './upload-status.component.html'
})
export class UploadStatusComponent {
  protected readonly MapListType = MapListType;
}
