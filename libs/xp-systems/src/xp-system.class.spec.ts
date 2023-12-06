import { XpSystems } from './xp-systems.class';

describe('XpSystemsService', () => {
  const service = new XpSystems();

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCosmeticXpInLevel', () => {
    it('should handle 0', () => {
      const xp = service.getCosmeticXpInLevel(0);
      expect(xp).toEqual(0);
    });

    it('should handle greater than 0', () => {
      const xp = service.getCosmeticXpInLevel(1);
      expect(xp).toBeGreaterThan(0);
    });
  });

  describe('getCosmeticXpForLevel', () => {
    it('should handle 0', () => {
      const xp = service.getCosmeticXpForLevel(0);
      expect(xp).toEqual(0);
    });

    it('should handle greater than 0', () => {
      const xp = service.getCosmeticXpForLevel(1);
      expect(xp).toBeGreaterThan(0);
    });
  });
});
