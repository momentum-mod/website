import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { HomeComponent } from './pages/home/home.component';
import { AuthGuard } from './guards/auth.guard';

@NgModule({
  imports: [
    RouterModule.forRoot([
      {
        path: '',
        component: HomeComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'maps',
        loadChildren: () =>
          import('./pages/maps/map.module').then((m) => m.MapModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'stats',
        loadChildren: () =>
          import('./pages/stats/stats.module').then((m) => m.StatsModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'community',
        loadChildren: () =>
          import('./pages/community/community.module').then(
            (m) => m.CommunityModule
          ),
        canActivate: [AuthGuard]
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./pages/profile/profile.module').then((m) => m.ProfileModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'admin',
        loadChildren: () =>
          import('./pages/admin/admin.module').then((m) => m.AdminModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'runs',
        loadChildren: () =>
          import('./pages/runs/runs.module').then((m) => m.RunsModule),
        canActivate: [AuthGuard]
      },
      {
        path: '**',
        component: NotFoundComponent
      }
    ])
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
