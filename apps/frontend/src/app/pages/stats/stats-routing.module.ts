import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { StatsComponent } from './stats.component';
import { NotFoundComponent } from '../not-found/not-found.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: StatsComponent,
        children: [{ path: '**', component: NotFoundComponent }]
      }
    ])
  ],
  exports: [RouterModule]
})
export class StatsRoutingModule {}
