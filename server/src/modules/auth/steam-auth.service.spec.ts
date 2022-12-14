import { Test, TestingModule } from '@nestjs/testing';
import { SteamAuthService } from './steam-auth.service';

describe('TestService', () => {
    let service: SteamAuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SteamAuthService]
        }).compile();

        service = module.get<SteamAuthService>(SteamAuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // TODO: We should write unit tests for this service. I just don't have the energy atm :)
});
