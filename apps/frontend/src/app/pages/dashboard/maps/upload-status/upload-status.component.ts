import { Component } from '@angular/core';
import { MapListType } from '../map-list/map-list.component';

@Component({
  selector: 'mom-upload-status',
  templateUrl: './upload-status.component.html'
})
export class UploadStatusComponent {
  protected readonly MapListType = MapListType;
}
