import { Role } from '@momentum/constants';
import { NbMenuItem } from '@nebular/theme';

export const MENU_ITEMS: NbMenuItem[] = [
  {
    title: 'Dashboard',
    icon: 'home-outline',
    link: '/dashboard',
    home: true
  },
  {
    title: 'Community',
    icon: 'account-multiple-outline',
    children: [
      {
        title: 'Momentum',
        link: '/dashboard/community/news',
        icon: { icon: 'logo', pack: 'mom' }
      },
      {
        title: 'Twitch',
        link: '/dashboard/community/twitch',
        icon: { icon: 'twitch', pack: 'si' }
      },
      {
        title: 'Recent Activity',
        link: '/dashboard/community/activity',
        icon: 'run-fast'
      }
    ]
  },
  {
    title: 'Maps',
    icon: 'panorama-outline',
    link: '/dashboard/maps',
    children: [
      {
        title: 'Map Uploads',
        icon: 'cloud-upload-outline',
        link: '/dashboard/maps/uploads',
        pathMatch: 'prefix',
        data: {
          roles: [Role.MAPPER, Role.ADMIN]
        }
      },
      {
        title: 'Browse Maps',
        icon: 'panorama-variant-outline',
        pathMatch: 'prefix',
        link: '/dashboard/maps'
      }
    ]
  },
  {
    title: 'Statistics',
    icon: 'chart-box-outline',
    link: '/dashboard/stats'
  },
  {
    title: 'Administration',
    icon: 'shield-crown-outline',
    link: '/dashboard/admin',
    data: {
      roles: [Role.ADMIN, Role.MODERATOR]
    },
    children: [
      {
        title: 'Map Queue',
        link: '/dashboard/admin/map-queue'
      },
      {
        title: 'Report Queue',
        link: '/dashboard/admin/report-queue'
      },
      {
        title: 'Utilities',
        link: '/dashboard/admin/utilities'
      },
      {
        title: 'XP Systems',
        link: '/dashboard/admin/xp-systems'
      }
    ]
  },
  {
    title: 'Documentation',
    icon: 'book-open-variant',
    url: 'https://docs.momentum-mod.org'
  }
];
