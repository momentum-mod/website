import { Component } from '@angular/core';

@Component({
  selector: 'app-map-queue',
  styleUrls: ['./upload-map.component.scss'],
  templateUrl: './upload-map.component.html',
})
export class UploadMapComponent {

  icons = {

    nebular: ['Your submitted maps will appear here'],

    ionicons: ['Your approved maps will appear here'],
  };

}
