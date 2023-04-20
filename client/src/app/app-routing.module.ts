import {
  ExtraOptions,
  PreloadAllModules,
  RouterModule,
  Routes
} from '@angular/router';
import { NgModule } from '@angular/core';
import { MainPageComponent } from './pages/main/main-page.component';
import { NotFoundMainComponent } from './pages/not-found/main/not-found-main.component';
import { AuthGuard } from './@core/guards/auth.guard';
import { OutgoingComponent } from './pages/outgoing/outgoing.component';

const routes: Routes = [
  {
    path: '',
    component: MainPageComponent
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./pages/dashboard/dashboard.module').then(
        (m) => m.DashboardModule
      )
  },
  {
    path: 'outgoing/:url',
    component: OutgoingComponent
  },
  {
    path: '**',
    component: NotFoundMainComponent
  }
];

const config: ExtraOptions = {
  useHash: false,
  preloadingStrategy: PreloadAllModules
};

@NgModule({
  imports: [RouterModule.forRoot(routes, config)],
  exports: [RouterModule],
  providers: [AuthGuard]
})
export class AppRoutingModule {}
