import { NbMenuItem } from '@nebular/theme';
import {Role} from '../../@core/models/role.model';

export const MENU_ITEMS: NbMenuItem[] = [
  {
    title: 'Dashboard',
    icon: 'ion-home',
    link: '/dashboard',
    home: true,
  },
  {
    title: 'Community',
    icon: 'ion-android-people',
    children: [
      {
        'title': 'Momentum Official',
        'link': '/dashboard/community/news',
      },
      {
        'title': 'Twitch',
        'link': '/dashboard/community/twitch',
      },
      {
        'title': 'Recent Activity',
        'link': '/dashboard/community/activity',
      },
    ],
  },
  {
    title: 'Maps',
    icon: 'ion-android-download',
    link: '/dashboard/maps',
    children: [
      {
        title: 'Map Uploads',
        link: '/dashboard/maps/uploads',
        pathMatch: 'partial',
        data: {
          roles: [
            Role.MAPPER,
            Role.ADMIN,
          ],
        },
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
  {
    title: 'Statistics',
    icon: 'ion-stats-bars',
    link: '/dashboard/stats',
  },
  {
    title: 'Administration',
    icon: 'ion-locked',
    link: '/dashboard/admin',
    data: {
      roles: [
        Role.ADMIN,
        Role.MODERATOR,
      ],
    },
    children: [
      {
        title: 'Map Queue',
        link: '/dashboard/admin/map-queue',
      },
      {
        title: 'Report Queue',
        link: '/dashboard/admin/report-queue',
      },
      {
        title: 'Utilities',
        link: '/dashboard/admin/utilities',
      },
    ],
  },
];
