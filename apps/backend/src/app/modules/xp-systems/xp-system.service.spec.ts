import { Test, TestingModule } from '@nestjs/testing';
import { XpSystemsService } from './xp-systems.service';
import { mockDeep } from 'jest-mock-extended';
import { PRISMA_MOCK_PROVIDER } from '../../../../test/prisma-mock.const';

describe('XpSystemsService', () => {
  let service: XpSystemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [XpSystemsService, PRISMA_MOCK_PROVIDER]
    })
      .useMocker(mockDeep)
      .compile();

    service = module.get<XpSystemsService>(XpSystemsService);
    await service.onModuleInit();
  });

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
      const xp = service.getCosmeticXpInLevel(0);
      expect(xp).toEqual(0);
    });
    it('should handle greater than 0', () => {
      const xp = service.getCosmeticXpInLevel(1);
      expect(xp).toBeGreaterThan(0);
    });
  });
});
