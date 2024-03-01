import { Icon, IconPack } from './icons';

export const SIDENAV_ITEMS: Array<{
  title: string;
  needsMod?: boolean;
  items: Array<{
    title: string;
    external?: boolean;
    link: string;
    icon: Icon;
    pack?: IconPack;
  }>;
}> = [
  {
    title: 'Maps',
    items: [
      {
        title: 'Browser',
        link: '/maps',
        icon: 'panorama-outline'
      },
      {
        title: 'Submission',
        link: '/maps/submissions',
        icon: 'cloud-upload-outline'
      }
    ]
  },
  {
    title: 'Community',
    items: [
      {
        title: 'Streams',
        link: '/community/twitch',
        icon: 'twitch',
        pack: 'si'
      },
      {
        title: 'Developer Blog',
        link: '/community/news',
        icon: 'newspaper-variant'
      }
    ]
  },
  {
    title: 'Administration',
    needsMod: true,
    items: [
      {
        title: 'Map Queue',
        link: '/admin/map-queue',
        icon: 'tray-full'
      },
      {
        title: 'Report Queue',
        link: '/admin/report-queue',
        icon: 'emoticon-angry'
      },
      {
        title: 'Admin Activity',
        link: '/admin/admin-activity',
        icon: 'notebook-outline'
      },
      {
        title: 'Utilities',
        link: '/admin/utilities',
        icon: 'tools'
      }
    ]
  },
  {
    title: 'External',
    items: [
      {
        title: 'Steam',
        link: 'https://store.steampowered.com/app/669270/Momentum_Mod/',
        external: true,
        icon: 'steam',
        pack: 'si'
      },
      {
        title: 'Discord',
        link: 'https://discord.gg/momentummod',
        external: true,
        icon: 'discord',
        pack: 'si'
      },
      {
        title: 'Github',
        link: 'https://github.com/momentum-mod',
        external: true,
        icon: 'github',
        pack: 'si'
      }
    ]
  }
];
