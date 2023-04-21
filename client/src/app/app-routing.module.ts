import { PreloadAllModules, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { MainPageComponent } from './pages/main/main-page.component';
import { NotFoundMainComponent } from './pages/not-found/main/not-found-main.component';
import { AuthGuard } from './@core/guards/auth.guard';
import { OutgoingComponent } from './pages/outgoing/outgoing.component';

@NgModule({
  imports: [
    RouterModule.forRoot(
      [
        { path: '', component: MainPageComponent },
        {
          path: 'dashboard',
          canActivate: [AuthGuard],
          loadChildren: () =>
            import('./pages/dashboard/dashboard.module').then(
              (m) => m.DashboardModule
            )
        },
        { path: 'outgoing/:url', component: OutgoingComponent },
        { path: '**', component: NotFoundMainComponent }
      ],
      {
        useHash: false,
        preloadingStrategy: PreloadAllModules
      }
    )
  ],
  exports: [RouterModule],
  providers: [AuthGuard]
})
export class AppRoutingModule {}
