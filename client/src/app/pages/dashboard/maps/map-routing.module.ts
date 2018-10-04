import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { MapComponent} from './map.component';
import {NotFoundDashboardComponent} from '../../not-found/dashboard/not-found-dashboard.component';
import {MapQueueComponent} from './map-queue/map-queue.component';
import {ViewMapsComponent} from './view-maps/view-maps.component';
import {UploadMapComponent} from './upload-map/upload-map.component';

const routes: Routes = [
  {
    path: '',
    component: MapComponent,
    children: [
      {
      path: 'upload-map',
      component: UploadMapComponent,
      },
      {
       path: 'view-maps',
       component: ViewMapsComponent,
      },
      {
        path: 'map-queue',
        component: MapQueueComponent,
      },
      {
        path: '**',
        component: NotFoundDashboardComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MapRoutingModule {
}
