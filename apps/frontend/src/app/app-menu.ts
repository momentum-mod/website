import { Role } from '@momentum/constants';
import { NbMenuItem } from '@nebular/theme';

export const MENU_ITEMS: NbMenuItem[] = [
  {
    title: 'Dashboard',
    icon: 'home-outline',
    link: '',
    home: true
  },
  {
    title: 'Community',
    icon: 'account-multiple-outline',
    children: [
      {
        title: 'Momentum',
        link: '/community/news',
        icon: { icon: 'logo', pack: 'mom' }
      },
      {
        title: 'Twitch',
        link: '/community/twitch',
        icon: { icon: 'twitch', pack: 'si' }
      },
      {
        title: 'Recent Activity',
        link: '/community/activity',
        icon: 'run-fast'
      }
    ]
  },
  {
    title: 'Maps',
    icon: 'panorama-outline',
    link: '/maps',
    children: [
      {
        title: 'Map Uploads',
        icon: 'cloud-upload-outline',
        link: '/maps/submissions',
        pathMatch: 'prefix'
      },
      {
        title: 'Browse Maps',
        icon: 'panorama-variant-outline',
        pathMatch: 'prefix',
        link: '/maps'
      }
    ]
  },
  {
    title: 'Statistics',
    icon: 'chart-box-outline',
    link: '/stats'
  },
  {
    title: 'Administration',
    icon: 'shield-crown-outline',
    link: '/admin',
    data: {
      roles: [Role.ADMIN, Role.MODERATOR]
    },
    children: [
      {
        title: 'Map Queue',
        link: '/admin/map-queue'
      },
      {
        title: 'Report Queue',
        link: '/admin/report-queue'
      },
      {
        title: 'Utilities',
        link: '/admin/utilities'
      },
      {
        title: 'XP Systems',
        link: '/admin/xp-systems'
      }
    ]
  },
  {
    title: 'Documentation',
    icon: 'book-open-variant',
    url: 'https://docs.momentum-mod.org'
  }
];
