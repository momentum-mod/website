import { Component } from '@angular/core';

@Component({
  selector: 'app-map-queue',
  styleUrls: ['./view-maps.component.scss'],
  templateUrl: './view-maps.component.html',
})
export class ViewMapsComponent {

  icons = {

    nebular: ['Your submitted maps will appear here'],

    ionicons: ['Your approved maps will appear here'],
  };

}
