import { SteamGame } from '../enums/steam-game.enum';

export const SteamGamesNames: ReadonlyMap<SteamGame, string> = new Map([
  [SteamGame.CSS, 'Counter-Strike: Source'],
  [SteamGame.TF2, 'Team Fortress 2'],
  [SteamGame.PORTAL2, 'Portal 2'],
  [SteamGame.CSGO, 'Counter-Strike: Global Offensive']
]);

export const SteamGamesImages: ReadonlyMap<SteamGame, string> = new Map([
  [SteamGame.CSS, '/assets/images/games-logos/css.png'],
  [SteamGame.TF2, '/assets/images/games-logos/tf2.png'],
  [SteamGame.PORTAL2, '/assets/images/games-logos/portal2.png'],
  [SteamGame.CSGO, '/assets/images/games-logos/csgo.png']
]);
