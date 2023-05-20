import { env } from '@momentum/frontend/env';

export function apiUrl(url: string) {
  return env.api + '/' + url;
}
