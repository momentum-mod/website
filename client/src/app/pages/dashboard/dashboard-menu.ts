import {NbMenuItem} from '@nebular/theme';
import {Role} from '../../@core/models/role.model';

export const MENU_ITEMS: NbMenuItem[] = [
  {
    title: 'Dashboard',
    icon: 'home-outline',
    link: '/dashboard',
    home: true,
  },
  {
    title: 'Community',
    icon: 'people-outline',
    children: [
      {
        title: 'Momentum Official',
        link: '/dashboard/community/news',
      },
      {
        title: 'Twitch',
        link: '/dashboard/community/twitch',
      },
      {
        title: 'Recent Activity',
        link: '/dashboard/community/activity',
      },
    ],
  },
  {
    title: 'Maps',
    icon: 'map-outline',
    link: '/dashboard/maps',
    children: [
      {
        title: 'Map Uploads',
        icon: 'upload-outline',
        link: '/dashboard/maps/uploads',
        pathMatch: 'prefix',
        data: {
          roles: [
            Role.MAPPER,
            Role.ADMIN,
            Role.MODERATOR,
          ],
        },
      },
      {
        title: 'My Library',
        icon: 'hard-drive-outline',
        link: '/dashboard/maps/library',
      },
      {
        title: 'Favorite Maps',
        icon: 'star-outline',
        link: '/dashboard/maps/favorites',
      },
      {
        title: 'Browse Maps',
        icon: 'cloud-download-outline',
        pathMatch: 'prefix',
        link: '/dashboard/maps',
      },
    ],
  },
  {
    title: 'Statistics',
    icon: 'bar-chart-outline',
    link: '/dashboard/stats',
  },
  {
    title: 'Administration',
    icon: 'lock-outline',
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
      {
        title: 'XP Systems',
        link: '/dashboard/admin/xp-systems',
      },
    ],
  },
  {
    title: 'Forums',
    icon: 'people',
    url: 'https://forum.momentum-mod.org/',
  },
  {
    title: 'Documentation',
    icon: 'file-text-outline',
    url: 'https://docs.momentum-mod.org',
  },
];
