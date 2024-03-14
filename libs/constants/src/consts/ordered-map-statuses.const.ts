import { Enum } from '@momentum/enum';
import { MapStatus } from '../enums/map-status.enum';
import { MapStatusName } from '../maps/map-status-name.map';

/**
 * Alphabetically ordered array of map statuses that we use in the frontend
 */
export const ORDERED_MAP_STATUSES: Array<{
  value: MapStatus | null;
  text: string;
}> = [
  ...Enum.values(MapStatus)
    .map(
      (status) =>
        ({ value: status, text: MapStatusName.get(status) }) as {
          value: MapStatus | null;
          text: string;
        }
    )
    .sort((a, b) => (a.text > b.text ? 1 : -1))
];
