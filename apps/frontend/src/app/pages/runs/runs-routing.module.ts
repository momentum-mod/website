import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RunInfoComponent } from './run-info/run-info.component';
import { NotFoundComponent } from '../not-found/not-found.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: NotFoundComponent,
        children: [
          {
            path: ':id',
            component: RunInfoComponent
          },
          { path: '**', component: NotFoundComponent }
        ]
      }
    ])
  ],
  exports: [RouterModule]
})
export class RunsRoutingModule {}
