import { GamemodeInfo } from '@momentum/constants';
/**
 * Check if a map name start with prefix (e.g. surf_) and returns tuple of the
 * name without the prefix, then the prefix.
 */
export function extractPrefixFromMapName(
  name: string
): [string, string | null] {
  const { prefix } =
    GamemodeInfo.values().find(({ prefix }) => name.startsWith(prefix + '_')) ??
    {};

  if (prefix) {
    return [name.slice(prefix.length + 1), prefix];
  } else {
    return [name, null];
  }
}
