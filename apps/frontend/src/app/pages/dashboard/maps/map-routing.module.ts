import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { MapComponent } from './map.component';
import { NotFoundDashboardComponent } from '../../not-found/dashboard/not-found-dashboard.component';
import { ViewMapsComponent } from './view-maps/view-maps.component';
import { MapUploadFormComponent } from './upload-form/map-upload-form.component';
import { UploadStatusComponent } from './upload-status/upload-status.component';
import { MapInfoComponent } from './map-info/map-info.component';
import { MapEditComponent } from './map-edit/map-edit.component';
import { RoleGuard } from '../../../guards/role.guard';
import { Role } from '@momentum/constants';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: MapComponent,
        children: [
          { path: '', pathMatch: 'full', component: ViewMapsComponent },
          {
            path: 'uploads',
            canActivate: [RoleGuard],
            data: { roles: [Role.MAPPER, Role.ADMIN] },
            children: [
              { path: '', component: UploadStatusComponent },
              { path: 'new', component: MapUploadFormComponent }
            ]
          },
          { path: ':id', component: MapInfoComponent },
          { path: ':id/edit', component: MapEditComponent },
          { path: '**', component: NotFoundDashboardComponent }
        ]
      }
    ])
  ],
  exports: [RouterModule]
})
export class MapRoutingModule {}
