// Very permissive regex for whenever exact criteria not avoilable online
const defaultRegex = /^[\w-]{3,40}$/;

export type Socials = {
  Discord?: string;
  Twitch?: string;
  YouTube?: string;
  Github?: string;
  Twitter?: string;
  Mastodon?: string;
  LinkedIn?: string;
  Instagram?: string;
  Spotify?: string;
  Patreon?: string;
  'Ko-fi'?: string;
  Paypal?: string;
};

export const SocialsData: Readonly<
  Record<
    keyof Socials,
    { icon: string; regex: RegExp; example: string; url: string }
  >
> = {
  Discord: {
    icon: 'discord',
    regex: /^[\w-]{2,32}$/,
    example: 'username',
    url: 'discordapp.com/users'
  },
  Twitch: {
    icon: 'twitch',
    regex: /^[\w-]{4,25}$/,
    example: 'username',
    url: 'twitch.tv'
  },
  YouTube: {
    icon: 'youtube',
    regex: /^@[\w-]{3,30}$/,
    example: '@username',
    url: 'youtube.com'
  },
  Github: {
    icon: 'github',
    regex: /^[\w-]{2,39}$/,
    example: 'username',
    url: 'github.com'
  },
  Twitter: {
    icon: 'twitter',
    regex: /^[\w-]{2,15}$/,
    example: 'username',
    url: 'twitter.com'
  },
  Mastodon: {
    icon: 'mastodon',
    regex: /^(?:@[\w-]+){2}\.[\w-]+$/,
    example: '@user@instance',
    // For any Mastodon instance `foo`, user `user`, user's instance `instance`,
    // https://foo/@user@instance redirects to https://instance/@user.
    // So just using the official instance works for everything.
    url: 'mastodon.social'
  },
  LinkedIn: {
    icon: 'linkedin',
    regex: defaultRegex,
    example: 'firstname-lastname-12345',
    url: 'linkedin.com/in'
  },
  Instagram: {
    icon: 'instagram',
    regex: defaultRegex, // Sequential underscores are allowed
    example: 'username',
    url: 'instagram.com'
  },
  Spotify: {
    icon: 'spotify',
    regex: defaultRegex, // Just randomly generated alphanumeric
    example: '21ahtj33ps3kiiet4sqq4pnra',
    url: 'open.spotify.com/user'
  },
  Patreon: {
    icon: 'patreon',
    regex: defaultRegex,
    example: 'username',
    url: 'patreon.com'
  },
  'Ko-fi': {
    icon: 'kofi',
    regex: defaultRegex,
    example: 'username',
    url: 'ko-fi.com'
  },
  Paypal: {
    icon: 'paypal',
    // Either email or @whatever
    regex: /^@[\w-]{3,30}$/,
    example: 'username (Must be a paypal.me profile)',
    url: 'paypal.me'
  }
};
