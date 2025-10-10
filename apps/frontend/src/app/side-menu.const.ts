import { Icon, IconPack } from './icons';

export const SIDENAV_ITEMS: Array<{
  title: string;
  needsMod?: boolean;
  isPublic?: boolean;
  items: Array<{
    title: string;
    external?: boolean;
    link: string;
    icon: Icon;
    pack?: IconPack;
    isPublic?: boolean;
    hideOnLimited?: boolean;
  }>;
}> = [
  {
    title: 'Maps',
    items: [
      {
        title: 'Browser',
        link: '/maps',
        icon: 'panorama-outline',
        isPublic: true
      },
      {
        title: 'Beta Maps',
        link: '/maps/beta',
        icon: 'test-tube'
      },
      {
        title: 'Your Maps',
        link: '/maps/submissions',
        icon: 'upload',
        hideOnLimited: true
      }
    ]
  },
  {
    title: 'Community',
    isPublic: true,
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
        link: '/admin/reports',
        icon: 'emoticon-angry'
      },
      {
        title: 'Admin Activity',
        link: '/admin/activity',
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
    isPublic: true,
    items: [
      {
        title: 'Discord',
        link: 'https://discord.gg/momentummod',
        external: true,
        icon: 'discord',
        pack: 'si'
      },
      {
        title: 'Frontpage',
        link: 'https://momentum-mod.org',
        external: true,
        icon: 'web',
        isPublic: true
      },
      {
        title: 'Docs',
        link: 'https://docs.momentum-mod.org',
        external: true,
        icon: 'book-open-variant',
        isPublic: true
      },
      {
        title: 'Status',
        link: 'https://status.momentum-mod.org',
        external: true,
        icon: 'wrench-clock',
        isPublic: true
      },
      {
        title: 'Github',
        link: 'https://github.com/momentum-mod',
        external: true,
        icon: 'github',
        pack: 'si'
      },
      {
        title: 'Steam',
        link: 'https://store.steampowered.com/app/669270/Momentum_Mod/',
        external: true,
        icon: 'steam',
        pack: 'si'
      }
    ]
  }
];
