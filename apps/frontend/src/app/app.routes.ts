import { Route } from '@angular/router';
import { Role } from '@momentum/constants';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { HomeComponent } from './pages/home/home.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { RedirectGuard } from './guards/redirect.guard';
import { LimitedGuard } from './guards/limited.guard';

export const APP_ROUTES: Route[] = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [RedirectGuard],
    title: 'Dashboard'
  },
  {
    path: 'maps',
    loadChildren: () => import('./pages/maps/routes-user-facing')
  },
  {
    path: 'map-edit',
    loadChildren: () => import('./pages/maps/routes-mapper-facing'),
    canActivate: [AuthGuard, LimitedGuard]
  },
  {
    path: 'community',
    loadChildren: () => import('./pages/community/routes')
  },
  {
    path: 'profile',
    loadChildren: () => import('./pages/profile/routes')
  },
  {
    path: 'admin',
    loadChildren: () => import('./pages/admin/routes'),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [Role.ADMIN, Role.MODERATOR] }
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Not Found'
  }
];
