import { Gamemode, GamemodeCategory } from '../enums/gamemode.enum';

// prettier-ignore
export const GamemodeCategories: ReadonlyMap<
  GamemodeCategory,
  Array<Gamemode>
> = new Map([
  [GamemodeCategory.SURF,     [Gamemode.SURF]],
  [GamemodeCategory.BHOP,     [Gamemode.BHOP, Gamemode.BHOP_HL1]],
  [GamemodeCategory.RJ,       [Gamemode.RJ]],
  [GamemodeCategory.SJ,       [Gamemode.SJ]],
  [GamemodeCategory.AHOP,     [Gamemode.AHOP]],
  [GamemodeCategory.CONC,     [Gamemode.CONC]],
  [GamemodeCategory.DEFRAG,   [Gamemode.DEFRAG_CPM, Gamemode.DEFRAG_VQ3, Gamemode.DEFRAG_VTG]],
  [GamemodeCategory.CLIMB,    [Gamemode.CLIMB_KZT, Gamemode.CLIMB_MOM, Gamemode.CLIMB_16]]
]);

export interface GamemodeInfoProperties {
  category: GamemodeCategory;
  name: string;
  webIcon: string; // Might do a Pano variant here in the future
  prefix: string;
}

export const GamemodeInfo: ReadonlyMap<Gamemode, GamemodeInfoProperties> =
  new Map([
    [
      Gamemode.SURF,
      {
        category: GamemodeCategory.SURF,
        name: 'Surf',
        prefix: 'surf',
        webIcon: 'assets/images/gamemodes/surf.png'
      }
    ],
    [
      Gamemode.BHOP,
      {
        category: GamemodeCategory.BHOP,
        name: 'Bhop',
        prefix: 'bhop',
        webIcon: 'assets/images/gamemodes/bhop.png'
      }
    ],
    [
      Gamemode.BHOP_HL1,
      {
        category: GamemodeCategory.BHOP,
        name: 'Bhop (HL1)',
        prefix: 'bhop',
        webIcon: 'assets/images/gamemodes/bhop.png'
      }
    ],
    [
      Gamemode.RJ,
      {
        category: GamemodeCategory.RJ,
        name: 'Rocket Jump',
        prefix: 'rj',
        webIcon: 'assets/images/gamemodes/rj.png'
      }
    ],
    [
      Gamemode.SJ,
      {
        category: GamemodeCategory.SJ,
        name: 'Sticky Jump',
        prefix: 'sj',
        webIcon: 'assets/images/gamemodes/sj.png'
      }
    ],
    [
      Gamemode.AHOP,
      {
        category: GamemodeCategory.AHOP,
        name: 'Ahop',
        prefix: 'ahop',
        webIcon: 'assets/images/gamemodes/ahop.png'
      }
    ],
    [
      Gamemode.CONC,
      {
        category: GamemodeCategory.CONC,
        name: 'Conc',
        prefix: 'conc',
        webIcon: 'assets/images/gamemodes/conc.png'
      }
    ],
    [
      Gamemode.DEFRAG_CPM,
      {
        category: GamemodeCategory.DEFRAG,
        name: 'Defrag (CPM)',
        prefix: 'df',
        webIcon: 'assets/images/gamemodes/defrag.png'
      }
    ],
    [
      Gamemode.DEFRAG_VQ3,
      {
        category: GamemodeCategory.DEFRAG,
        name: 'Defrag (VQ3)',
        prefix: 'df',
        webIcon: 'assets/images/gamemodes/defrag.png'
      }
    ],
    [
      Gamemode.DEFRAG_VTG,
      {
        category: GamemodeCategory.DEFRAG,
        name: 'Defrag (Vintage)',
        prefix: 'df',
        webIcon: 'assets/images/gamemodes/defrag.png'
      }
    ],
    [
      Gamemode.CLIMB_MOM,
      {
        category: GamemodeCategory.CLIMB,
        name: 'Climb (Momentum)',
        prefix: 'climb',
        webIcon: 'assets/images/gamemodes/climb.png'
      }
    ],
    [
      Gamemode.CLIMB_KZT,
      {
        category: GamemodeCategory.CLIMB,
        name: 'Climb (KZT)',
        prefix: 'climb',
        webIcon: 'assets/images/gamemodes/climb.png'
      }
    ],
    [
      Gamemode.CLIMB_16,
      {
        category: GamemodeCategory.CLIMB,
        name: 'Climb (1.6)',
        prefix: 'climb',
        webIcon: 'assets/images/gamemodes/climb.png'
      }
    ]
  ]);
