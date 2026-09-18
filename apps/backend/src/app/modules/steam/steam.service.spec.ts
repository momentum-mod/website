import { of } from 'rxjs';
import { SteamService } from './steam.service';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

describe('SteamService', () => {
  let service: SteamService;
  const httpGetMock = jest.fn();
  const fetchMock = jest.fn();

  const setFetchMockResponse = (text: string) => {
    fetchMock.mockResolvedValueOnce({ text: () => Promise.resolve(text) });
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SteamService,
        {
          provide: HttpService,
          useValue: { get: httpGetMock }
        },
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
      httpGetMock.mockReturnValueOnce(
        of({ data: { response: { player_level: 34 } } })
      );
      const result = await service.isAccountLimited(76561198039308694n);

      expect(result).toBe(false);
    });

    it('should return true for a limited account', async () => {
      httpGetMock.mockReturnValueOnce(
        of({ data: { response: { player_level: 0 } } })
      );

      const result = await service.isAccountLimited(76561198039308694n);

      expect(result).toBe(true);
    });

    describe('should fallback to steamcommunity logic', () => {
      beforeEach(() => {
        httpGetMock.mockReturnValueOnce(of({ data: { response: {} } }));
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
