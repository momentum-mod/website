import { XpSystems } from './xp-systems.class';

describe('XpSystemsService', () => {
  const service = new XpSystems();

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate correct level assignments for original constants', () => {
    // These constants may get changed in the future, we only care about the
    // maths, so mock here and check values correspond to below sheet
    // https://docs.google.com/spreadsheets/d/1JiHJYsxlGPXAZqCPh7-paJI6U_TH-Ro0H0OWDFCiA74

    // Note, this is NOT quite what the linked spreadsheet produces.
    // At level 101, the sheet expects xpInLevel from 101 to be
    // 152000 - it must factor in `startingValue` for some reason. In code,
    // `startingValue` isn't used at all for levels greater than
    // `staticScaleStart`. Not really an issue, but worth being aware of.
    jest.replaceProperty(service, 'cosXpParams', {
      levels: {
        maxLevels: 500,
        startingValue: 20000,
        linearScaleBaseIncrease: 1000,
        linearScaleInterval: 10,
        linearScaleIntervalMultiplier: 1,
        staticScaleStart: 101,
        staticScaleBaseMultiplier: 1.5,
        staticScaleInterval: 25,
        staticScaleIntervalMultiplier: 0.5
      },
      completions: {
        unique: { tierScale: { linear: 2500, staged: 2500 } },
        repeat: {
          tierScale: { linear: 20, staged: 40, stages: 5, bonus: 40 }
        }
      }
    });

    // prettier-ignore
    for (const [ level, xpInLevel, xpForLevel ] of [
      // Level | XP in level | XP for level
      [  0,      0,            0         ],
      [  1,      21000,        0         ],
      [  2,      22000,        21000     ],
      [  3,      23000,        43000     ],
      [  4,      24000,        66000     ],
      [  5,      25000,        90000     ],
      [  6,      26000,        115000    ],
      [  7,      27000,        141000    ],
      [  8,      28000,        168000    ],
      [  9,      29000,        196000    ],
      [  10,     30000,        225000    ],
      [  11,     42000,        255000    ],
      [  97,     990000,       34005000  ],
      [  98,     1000000,      34995000  ],
      [  99,     1010000,      35995000  ],
      [  100,    1020000,      37005000  ],
      [  101,    1500000,      38025000  ],
      [  102,    1500000,      39525000  ],
      [  103,    1500000,      41025000  ],
      [  104,    1500000,      42525000  ],
    ]) {
      expect(service.getCosmeticXpInLevel(level)).toBe(xpInLevel);
      expect(service.getCosmeticXpForLevel(level)).toBe(xpForLevel);
    }
  });
});
