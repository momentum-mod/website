import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { MapComponent } from './map.component';
import { NotFoundDashboardComponent } from '../../not-found/dashboard/not-found-dashboard.component';
import { ViewMapsComponent } from './view-maps/view-maps.component';
import { MapSubmissionFormComponent } from './submission-form/map-submission-form.component';
import { MapSubmissionStatusComponent } from './submission-status/map-submission-status.component';
import { MapInfoComponent } from './map-info/map-info.component';
import { MapEditComponent } from './map-edit/map-edit.component';

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
            children: [
              { path: '', component: MapSubmissionStatusComponent },
              { path: 'new', component: MapSubmissionFormComponent }
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
