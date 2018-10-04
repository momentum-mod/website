import { Component } from '@angular/core';

@Component({
  selector: 'app-map-queue',
  styleUrls: ['./map-queue.component.scss'],
  templateUrl: './map-queue.component.html',
})
export class MapQueueComponent {

  icons = {

    nebular: ['Your submitted maps will appear here'],

    ionicons: ['Your approved maps will appear here'],
  };

}
