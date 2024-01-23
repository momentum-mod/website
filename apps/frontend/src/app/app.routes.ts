import { Route } from '@angular/router';
import { Role } from '@momentum/constants';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { HomeComponent } from './pages/home/home.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const APP_ROUTES: Route[] = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'maps',
    loadChildren: () => import('./pages/maps/routes'),
    canActivate: [AuthGuard]
  },
  {
    path: 'community',
    loadChildren: () => import('./pages/community/routes'),
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    loadChildren: () => import('./pages/profile/routes'),
    canActivate: [AuthGuard]
  },
  {
    path: 'admin',
    loadChildren: () => import('./pages/admin/routes'),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [Role.ADMIN, Role.MODERATOR] }
  },
  {
    path: '**',
    component: NotFoundComponent
  }
];
