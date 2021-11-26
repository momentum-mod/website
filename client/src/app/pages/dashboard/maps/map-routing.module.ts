import {RouterModule, Routes} from '@angular/router';
import {NgModule} from '@angular/core';
import {MapComponent} from './map.component';
import {NotFoundDashboardComponent} from '../../not-found/dashboard/not-found-dashboard.component';
import {ViewMapsComponent} from './view-maps/view-maps.component';
import {MapUploadFormComponent} from './upload-form/map-upload-form.component';
import {UploadStatusComponent} from './upload-status/upload-status.component';
import {MapInfoComponent} from './map-info/map-info.component';
import {MapLibraryComponent} from './map-library/map-library.component';
import {MapEditComponent} from './map-edit/map-edit.component';
import {RoleGuard} from '../../../@core/guards/role.guard';
import {Role} from '../../../@core/models/role.model';
import {MapFavoritesComponent} from './map-favorites/map-favorites.component';

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
        path: 'favorites',
        component: MapFavoritesComponent,
      },
      {
        path: 'uploads',
        canActivate: [RoleGuard],
        data: {
          onlyAllow: [
            Role.MAPPER,
            Role.ADMIN,
            Role.MODERATOR,
          ],
        },
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
        path: ':id',
        component: MapInfoComponent,
      },
      {
        path: ':id/edit',
        component: MapEditComponent,
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
