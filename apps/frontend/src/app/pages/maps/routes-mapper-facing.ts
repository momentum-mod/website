import { Route } from '@angular/router';
import { MapSubmissionFormComponent } from './submission-form/map-submission-form.component';
import { MapEditComponent } from './map-edit/map-edit.component';
import { DeactivateConfirmGuard } from '../../guards/component-can-deactivate.guard';

export default [
  {
    path: 'submit',
    component: MapSubmissionFormComponent,
    title: 'Submit Map',
    canDeactivate: [DeactivateConfirmGuard]
  },
  {
    path: ':name',
    component: MapEditComponent,
    canDeactivate: [DeactivateConfirmGuard]
  }
] satisfies Route[];
