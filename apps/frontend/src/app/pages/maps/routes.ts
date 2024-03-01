import { Route } from '@angular/router';
import { MapBrowserComponent } from './browsers/map-browser.component';
import { MapSubmissionFormComponent } from './submission-form/map-submission-form.component';
import { MapInfoComponent } from './map-info/map-info.component';
import { MapEditComponent } from './map-edit/map-edit.component';
import { DeactivateConfirmGuard } from '../../guards/component-can-deactivate.guard';
import { MapSubmissionBrowserComponent } from './browsers/map-submission-browser.component';
import { UserMapsBrowserComponent } from './browsers/user-maps-browser.component';

export default [
  { path: '', component: MapBrowserComponent },
  { path: 'beta', component: MapSubmissionBrowserComponent },
  {
    path: 'submissions',
    children: [
      { path: '', component: UserMapsBrowserComponent },
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
