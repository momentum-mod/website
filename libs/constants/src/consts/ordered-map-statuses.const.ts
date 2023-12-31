// TODO: "empty" field here is due to not switching to MapStatusNew yet (I think!)
import { Enum } from '@momentum/enum';
import { MapStatus } from '../enums/map-status.enum';
import { MapStatusName } from '../maps/map-status-name.map';

/**
 * Alphabetically ordered array of map statuses that we use frequently in
 * frontend.
 */
export const ORDERED_MAP_STATUSES: Array<{
  value: MapStatus | undefined;
  text: string;
}> = [
  { value: undefined, text: 'All' },
  ...Enum.values(MapStatus)
    .map(
      (status) =>
        ({ value: status, text: MapStatusName.get(status) }) as {
          value: MapStatus | undefined;
          text: string;
        }
    )
    .sort((a, b) => (a.text > b.text ? 1 : -1))
];
