import { SteamService } from './steam.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

describe('SteamService', () => {
  let service: SteamService;
  const fetchMock = jest.fn();

  const setFetchMockResponse = (data: string | object) => {
    fetchMock.mockResolvedValueOnce({
      text: () => Promise.resolve(data.toString()),
      json: () => Promise.resolve(data)
    });
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SteamService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn(), getOrThrow: jest.fn(() => 'whatever') }
        }
      ]
    }).compile();

    jest.spyOn(global, 'fetch').mockImplementation(fetchMock);

    service = module.get(SteamService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isAccountLimited', () => {
    it('should return false for an unlimited account', async () => {
      setFetchMockResponse({ response: { player_level: 34 } });
      const result = await service.isAccountLimited(76561198039308694n);

      expect(result).toBe(false);
    });

    it('should return true for a limited account', async () => {
      setFetchMockResponse({ response: { player_level: 0 } });

      const result = await service.isAccountLimited(76561198039308694n);

      expect(result).toBe(true);
    });

    describe('should fallback to steamcommunity logic', () => {
      beforeEach(() => {
        setFetchMockResponse({ response: {} });
      });

      it('should return false for an unlimited account', async () => {
        const unlimitedXml = `
        <profile>
          <steamID64>76561198039308694</steamID64>
          <isLimitedAccount>0</isLimitedAccount>
          <otherData>doesn't matter</otherData>
        </profile>
      `;

        setFetchMockResponse(unlimitedXml);

        const result = await service.isAccountLimited(76561198039308694n);

        expect(result).toBe(false);
      });

      it('should return true for a limited account', async () => {
        const limitedXml = `
        <profile>
          <steamID64>76561198039308694</steamID64>
          <isLimitedAccount>1</isLimitedAccount>
          <otherData>doesn't matter</otherData>
        </profile>
      `;

        setFetchMockResponse(limitedXml);

        const result = await service.isAccountLimited(76561198039308694n);

        expect(result).toBe(true);
      });

      it('should return true for an account without a profile setup', async () => {
        const noProfileXml = `
        <profile>
          <steamID64>76561199511085543</steamID64>
          <privacyMessage>
            This user has not yet set up their Steam Community profile.
          </privacyMessage>
        </profile>
      `;

        setFetchMockResponse(noProfileXml);

        const result = await service.isAccountLimited(76561199511085543n);

        expect(result).toBe(true);
      });
    });
  });
});
