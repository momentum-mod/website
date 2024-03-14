import { Enum } from '@momentum/enum';
import { Gamemode } from '../enums/gamemode.enum';
import { GamemodeName } from '../maps/gamemode-name.map';

/**
 * Alphabetically ordered array of gamemode that we use in the frontend
 */
export const ORDERED_GAMEMODES: Array<{
  value: Gamemode | null;
  text: string;
}> = [
  ...Enum.values(Gamemode)
    .map(
      (status) =>
        ({ value: status, text: GamemodeName.get(status) }) as {
          value: Gamemode | null;
          text: string;
        }
    )
    .sort((a, b) => (a.text > b.text ? 1 : -1))
];
