import { CombinedMapStatuses, MMap } from '@momentum/constants';

/**
 * Creates a blob of prettified map zones and downloads it using silly browser
 * methods. Afaik this is genuinely considered a good approach.
 * https://stackoverflow.com/a/52183135
 */
export function downloadZoneFile(map: MMap) {
  const zones = CombinedMapStatuses.IN_SUBMISSION.includes(map.status)
    ? map.submission?.currentVersion?.zones
    : map.zones;
  if (!zones?.formatVersion || !map.name) {
    console.error('Bad map data, could not create zones file!');
    return;
  }

  const json = JSON.stringify(zones, undefined, 4);
  const blob = new Blob([json]);
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  document.body.append(a);
  a.setAttribute('style', 'display: none');
  a.href = url;
  a.download = `${map.name}.json`;
  a.click();

  URL.revokeObjectURL(url);
  a.remove();
}
