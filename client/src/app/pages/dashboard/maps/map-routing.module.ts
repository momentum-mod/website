import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { MapComponent} from './map.component';
import {NotFoundDashboardComponent} from '../../not-found/dashboard/not-found-dashboard.component';
import {MapQueueComponent} from './map-queue/map-queue.component';
import {ViewMapsComponent} from './view-maps/view-maps.component';
import {UploadsComponent} from './uploads/uploads.component';
import {UploadStatusComponent} from './upload-status/upload-status.component';
import {MapInfoComponent} from './map-info/map-info.component';

const routes: Routes = [
  {
    path: '',
    component: MapComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: ViewMapsComponent,
      },
      {
        path: 'uploads',
        component: UploadStatusComponent,
      },
      {
        path: ':id',
        component: MapInfoComponent,
      },
      {
        path: 'uploads/new',
        component: UploadsComponent,
      },
      {
        path: 'queue',
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
