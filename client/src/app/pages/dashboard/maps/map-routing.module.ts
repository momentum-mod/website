import {RouterModule, Routes} from '@angular/router';
import {NgModule} from '@angular/core';
import {MapComponent} from './map.component';
import {NotFoundDashboardComponent} from '../../not-found/dashboard/not-found-dashboard.component';
import {MapQueueComponent} from './map-queue/map-queue.component';
import {ViewMapsComponent} from './view-maps/view-maps.component';
import {MapUploadFormComponent} from './upload-form/map-upload-form.component';
import {UploadStatusComponent} from './upload-status/upload-status.component';
import {MapInfoComponent} from './map-info/map-info.component';
import {MapLibraryComponent} from './map-library/map-library.component';

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
        path: 'library',
        component: MapLibraryComponent,
      },
      {
        path: 'uploads',
        children: [
          {
            path: '',
            component: UploadStatusComponent,
          },
          {
            path: 'new',
            component: MapUploadFormComponent,
          },
        ],
      },
      {
        path: 'queue',
        pathMatch: 'full',
        // TODO: uncomment this when ready to guard!
/*        canActivate: [PermissionGuard],
        data: {
          onlyAllow: [Permission.MODERATOR | Permission.ADMIN],
        },*/
        component: MapQueueComponent,
      },
      {
        path: ':id',
        component: MapInfoComponent,
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
