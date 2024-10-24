export function steamAvatarUrl(id: string): string {
  return `https://avatars.cloudflare.steamstatic.com/${id}_full.jpg`;
}

// This is the specific key Steam uses for all missing avatars.
// They even kept it when migrating to Cloudflare!
export const STEAM_MISSING_AVATAR = 'fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb';
export const STEAM_MISSING_AVATAR_URL = steamAvatarUrl(STEAM_MISSING_AVATAR);
