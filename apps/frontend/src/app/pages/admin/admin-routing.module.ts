import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { MapQueueComponent } from './map-queue/map-queue.component';
import { AdminComponent } from './admin.component';
import { ReportQueueComponent } from './report-queue/report-queue.component';
import { UtilitiesComponent } from './utilities/utilities.component';
import { Role } from '@momentum/constants';
import { NotFoundComponent } from '../not-found/not-found.component';
import { RoleGuard } from '../../guards/role.guard';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        component: AdminComponent,
        canActivate: [RoleGuard],
        data: { roles: [Role.ADMIN, Role.MODERATOR] },
        children: [
          {
            path: 'map-queue',
            pathMatch: 'full',
            component: MapQueueComponent
          },
          {
            path: 'report-queue',
            pathMatch: 'full',
            component: ReportQueueComponent
          },
          { path: 'utilities', component: UtilitiesComponent },
          { path: '**', component: NotFoundComponent }
        ]
      }
    ])
  ],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
