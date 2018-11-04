import { NbMenuItem } from '@nebular/theme';
import {Permission} from '../../@core/models/permissions.model';

export const MENU_ITEMS: NbMenuItem[] = [
  {
    title: 'Dashboard',
    icon: 'nb-home',
    link: '/dashboard',
    home: true,
  },
  {
    title: 'User Management',
    icon: 'nb-tables',
    link: '/dashboard/users',
    data: {
      permissions: [
        Permission.ADMIN,
        Permission.MODERATOR,
      ],
    },
  },
  {
    title: 'Community',
    icon: 'nb-compose',
    link: '/dashboard/community',
  },
  {
    title: 'Maps',
    icon: 'ion-map',
    link: '/dashboard/maps',
    children: [
      {
        title: 'Map Uploads',
        link: '/dashboard/maps/uploads',
        pathMatch: 'partial',
      },
      {
        title: 'Map Queue',
        link: '/dashboard/maps/queue',
      },
      {
        title: 'My Library',
        link: '/dashboard/maps/library',
      },
      {
        title: 'Browse Maps',
        pathMatch: 'partial',
        link: '/dashboard/maps',
      },
      ],
  },
];
