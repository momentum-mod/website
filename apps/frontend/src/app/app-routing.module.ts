import { PreloadAllModules, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { MainPageComponent } from './pages/main/main-page.component';
import { NotFoundMainComponent } from './pages/not-found/main/not-found-main.component';

@NgModule({
  imports: [
    RouterModule.forRoot(
      [
        { path: '', component: MainPageComponent },
        {
          path: 'dashboard',
          loadChildren: () =>
            import('./pages/dashboard/dashboard.module').then(
              (m) => m.DashboardModule
            )
        },
        { path: '**', component: NotFoundMainComponent }
      ],
      {
        useHash: false,
        preloadingStrategy: PreloadAllModules
      }
    )
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
