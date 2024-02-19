import { Route } from '@angular/router';
import { MapBrowserComponent } from './map-browser/map-browser.component';
import { MapSubmissionStatusComponent } from './submission-status/map-submission-status.component';
import { MapSubmissionFormComponent } from './submission-form/map-submission-form.component';
import { MapInfoComponent } from './map-info/map-info.component';
import { MapEditComponent } from './map-edit/map-edit.component';
import { DeactivateConfirmGuard } from '../../guards/component-can-deactivate.guard';

export default [
  { path: '', pathMatch: 'full', component: MapBrowserComponent },
  {
    path: 'submissions',
    children: [
      { path: '', component: MapSubmissionStatusComponent },
      {
        path: 'submit',
        component: MapSubmissionFormComponent,
        canDeactivate: [DeactivateConfirmGuard]
      }
    ]
  },
  { path: ':name', component: MapInfoComponent },
  {
    path: ':name/edit',
    component: MapEditComponent,
    canDeactivate: [DeactivateConfirmGuard]
  }
] satisfies Route[];
