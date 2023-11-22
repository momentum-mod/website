import { Route } from '@angular/router';
import { RunInfoComponent } from './run-info/run-info.component';

export default [{ path: ':id', component: RunInfoComponent }] satisfies Route[];
