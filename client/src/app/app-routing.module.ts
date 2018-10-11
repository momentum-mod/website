import {ExtraOptions, PreloadAllModules, RouterModule, Routes} from '@angular/router';
import { NgModule } from '@angular/core';
import {MainPageComponent} from './pages/main/main-page.component';
import {NotFoundMainComponent} from './pages/not-found/main/not-found-main.component';
import {AuthGuard} from './@core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: MainPageComponent,
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadChildren: 'app/pages/dashboard/dashboard.module#DashboardModule',
  },
  {
    path: '**',
    component: NotFoundMainComponent,
  },
];

const config: ExtraOptions = {
  useHash: false,
  preloadingStrategy: PreloadAllModules,
};

@NgModule({
  imports: [RouterModule.forRoot(routes, config)],
  exports: [RouterModule],
  providers: [AuthGuard],
})
export class AppRoutingModule {
}
