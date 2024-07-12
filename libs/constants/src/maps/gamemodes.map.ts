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

// See mom_system_gamemode.h for CPP version of similar properties
export interface GamemodeInfoProperties {
  category: GamemodeCategory;
  name: string;
  id: string;
  prefix: string;
  icon: string;
}

export const GamemodeInfo: ReadonlyMap<Gamemode, GamemodeInfoProperties> =
  new Map([
    [
      Gamemode.SURF,
      {
        category: GamemodeCategory.SURF,
        name: 'Surf',
        id: 'surf',
        prefix: 'surf',
        icon: 'surf'
      }
    ],
    [
      Gamemode.BHOP,
      {
        category: GamemodeCategory.BHOP,
        name: 'Bhop',
        id: 'bhop',
        prefix: 'bhop',
        icon: 'bhop'
      }
    ],
    [
      Gamemode.BHOP_HL1,
      {
        category: GamemodeCategory.BHOP,
        name: 'Bhop (HL1)',
        id: 'bhop_hl',
        prefix: 'bhophl',
        icon: 'bhop'
      }
    ],
    [
      Gamemode.CLIMB_MOM,
      {
        category: GamemodeCategory.CLIMB,
        name: 'Climb (Momentum)',
        id: 'kz_mom',
        prefix: 'kz',
        icon: 'climb'
      }
    ],
    [
      Gamemode.CLIMB_KZT,
      {
        category: GamemodeCategory.CLIMB,
        name: 'Climb (KZT)',
        id: 'kz_kzt',
        prefix: 'kzt',
        icon: 'climb'
      }
    ],
    [
      Gamemode.CLIMB_16,
      {
        category: GamemodeCategory.CLIMB,
        name: 'Climb (1.6)',
        id: 'kz_16',
        prefix: 'kz16',
        icon: 'climb'
      }
    ],
    [
      Gamemode.RJ,
      {
        category: GamemodeCategory.RJ,
        name: 'Rocket Jump',
        id: 'rj',
        prefix: 'rj',
        icon: 'rj'
      }
    ],
    [
      Gamemode.SJ,
      {
        category: GamemodeCategory.SJ,
        name: 'Sticky Jump',
        id: 'sj',
        prefix: 'sj',
        icon: 'sj'
      }
    ],
    [
      Gamemode.AHOP,
      {
        category: GamemodeCategory.AHOP,
        name: 'Ahop',
        id: 'ahop',
        prefix: 'ahop',
        icon: 'ahop'
      }
    ],
    [
      Gamemode.CONC,
      {
        category: GamemodeCategory.CONC,
        name: 'Conc',
        id: 'conc',
        prefix: 'conc',
        icon: 'conc'
      }
    ],
    [
      Gamemode.DEFRAG_CPM,
      {
        category: GamemodeCategory.DEFRAG,
        name: 'Defrag (CPM)',
        id: 'df_cpm',
        prefix: 'df',
        icon: 'defrag'
      }
    ],
    [
      Gamemode.DEFRAG_VQ3,
      {
        category: GamemodeCategory.DEFRAG,
        name: 'Defrag (VQ3)',
        id: 'df_vq3',
        prefix: 'df',
        icon: 'defrag'
      }
    ],
    [
      Gamemode.DEFRAG_VTG,
      {
        category: GamemodeCategory.DEFRAG,
        name: 'Defrag (Vintage)',
        id: 'df_vtg',
        prefix: 'df',
        icon: 'defrag'
      }
    ]
  ]);
