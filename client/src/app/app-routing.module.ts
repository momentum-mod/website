import {ExtraOptions, PreloadAllModules, RouterModule, Routes} from '@angular/router';
import { NgModule } from '@angular/core';
import {MainPageComponent} from './pages/main/main-page.component';
import {NotFoundMainComponent} from './pages/not-found/main/not-found-main.component';
import {UserProfileComponent} from './pages/user-profile/user-profile.component';

const routes: Routes = [
  {
    path: '',
    component: MainPageComponent,
  },
  {
    path: 'dashboard',
    loadChildren: 'app/pages/dashboard/dashboard.module#DashboardModule',
  },
  {
    path: 'user-profile',
    component: UserProfileComponent,
  },
  {
    path: '**',
    component: NotFoundMainComponent,
  },
/*  { path: '', redirectTo: 'pages', pathMatch: 'full' },*/
/*  { path: '**', redirectTo: 'pages' },*/
];

const config: ExtraOptions = {
  useHash: false,
  preloadingStrategy: PreloadAllModules,
};

@NgModule({
  imports: [RouterModule.forRoot(routes, config)],
  exports: [RouterModule],
})
export class AppRoutingModule {
}
