/**
 * All the submodes available in Momentum.
 *
 * It's simplest to store submodes in a flat structure, rather than nested based
 * on gamemode, e.g. we don't have an outer "DEFRAG" gamemode that includes CPM
 * and VQ3. If you like, think of our "submodes" as "gamemodes", and "gamemodes"
 * as "gamemode categories".
 */
export enum Gamemode {
  SURF = 1,
  BHOP = 2,
  RJ = 4,
  SJ = 5,
  AHOP = 7,
  CONC = 9,
  DEFRAG_CPM = 10,
  DEFRAG_VQ3 = 11
}
