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
        title: 'Beta Maps',
        link: '/maps/beta',
        icon: 'test-tube'
      },
      {
        title: 'Your Maps',
        link: '/maps/submissions',
        icon: 'upload'
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
        title: 'Map List',
        link: '/admin/maps',
        icon: 'panorama-variant-outline'
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
