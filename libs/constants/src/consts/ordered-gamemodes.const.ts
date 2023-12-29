import { Gamemode } from '../enums/gamemode.enum';
import { Enum } from '@momentum/enum';
import { GamemodeName } from '../maps/gamemode-name.map';

/**
 * Alphabetically ordered array of gamemode that we use frequently in frontend.
 */
export const ORDERED_GAMEMODES: Array<{
  value: Gamemode | undefined;
  text: string;
}> = [
  { value: undefined, text: 'All' },
  ...Enum.values(Gamemode)
    .map(
      (status) =>
        ({ value: status, text: GamemodeName.get(status) }) as {
          value: Gamemode | undefined;
          text: string;
        }
    )
    .sort((a, b) => (a.text > b.text ? 1 : -1))
];
