import { XpSystems } from './xp-systems.class';

describe('XpSystemsService', () => {
  const service = new XpSystems();

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate correct level assignments for original constants', () => {
    // These constants may get changed in the future, we also care about the maths,
    // so mock here and check values correspond to below sheet
    // https://docs.google.com/spreadsheets/d/1JiHJYsxlGPXAZqCPh7-paJI6U_TH-Ro0H0OWDFCiA74

    // Note, this is NOT quite what the linked spreadsheet produces.
    // At level 101, the sheet expects xpInLevel from 101 to be
    // 152000 - it must factor in `startingValue` for some reason.  In code,
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
    for (const { level, xpInLevel, total } of [
      { level: 1, xpInLevel: 21000, total: 21000 },
      { level: 2, xpInLevel: 22000, total: 43000 },
      { level: 3, xpInLevel: 23000, total: 66000 },
      { level: 4, xpInLevel: 24000, total: 90000 },
      { level: 5, xpInLevel: 25000, total: 115000 },
      { level: 6, xpInLevel: 26000, total: 141000 },
      { level: 7, xpInLevel: 27000, total: 168000 },
      { level: 8, xpInLevel: 28000, total: 196000 },
      { level: 9, xpInLevel: 29000, total: 225000 },
      { level: 10, xpInLevel: 30000, total: 255000 },
      { level: 11, xpInLevel: 42000, total: 297000 },
      { level: 97, xpInLevel: 990000, total: 34995000 },
      { level: 98, xpInLevel: 1000000, total: 35995000 },
      { level: 99, xpInLevel: 1010000, total: 37005000 },
      { level: 100, xpInLevel: 1020000, total: 38025000 },
      { level: 101, xpInLevel: 1500000, total: 39525000 },
      { level: 102, xpInLevel: 1500000, total: 41025000 },
      { level: 103, xpInLevel: 1500000, total: 42525000 },
      { level: 104, xpInLevel: 1500000, total: 44025000 }
    ]) {
      expect(service.getCosmeticXpInLevel(level)).toBe(xpInLevel);
      expect(service.getCosmeticXpForLevel(level)).toBe(total);
    }
  });
});
