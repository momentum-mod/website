import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { NotFoundDashboardComponent } from '../../not-found/dashboard/not-found-dashboard.component';
import { MapQueueComponent } from './map-queue/map-queue.component';
import { AdminComponent } from './admin.component';
import { ReportQueueComponent } from './report-queue/report-queue.component';
import { UtilitiesComponent } from './utilities/utilities.component';
import { XPSystemComponent } from './xp-system/xp-system.component';
import { RoleGuard } from '../../../guards/role.guard';
import { Role } from '@momentum/constants';

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
          { path: 'xp-systems', component: XPSystemComponent },
          { path: '**', component: NotFoundDashboardComponent }
        ]
      }
    ])
  ],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
