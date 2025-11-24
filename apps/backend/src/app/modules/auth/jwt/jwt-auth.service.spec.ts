import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';
import { JWTResponseGameDto, JWTResponseWebDto } from '../../../dto';
import {
  UserJwtAccessPayloadVerified,
  UserJwtPayloadVerified
} from '../auth.interface';
import {
  PRISMA_MOCK_PROVIDER,
  PrismaMock
} from '../../../../../test/prisma-mock.const';
import { EXTENDED_PRISMA_SERVICE } from '../../database/db.constants';
import { JwtAuthService } from './jwt-auth.service';

describe('JwtAuthService', () => {
  let service: JwtAuthService, db: PrismaMock;

  const jwtSecret = 'Homer Simpson';
  const testJwtService = new JwtService({ secret: jwtSecret });

  const jwtConfig = {
    expTime: '1m',
    gameExpTime: '2m',
    refreshExpTime: '3m'
  };

  const testWebTokenDto = (user, jwt) => {
    expect(jwt).toBeValidDto(JWTResponseWebDto);

    const decodedAccessToken = testJwtService.decode(
      jwt.accessToken
    ) as UserJwtAccessPayloadVerified;
    expect(decodedAccessToken).toMatchObject({
      id: user.id,
      steamID: user.steamID.toString(),
      gameAuth: false
    });

    expect(decodedAccessToken.exp - decodedAccessToken.iat).toBe(60); // 1m. JWT times are seconds, not ms.

    const decodedRefreshToken = testJwtService.decode(
      jwt.refreshToken
    ) as UserJwtPayloadVerified;
    expect(decodedRefreshToken.id).toBe(user.id);

    expect(decodedRefreshToken.exp - decodedRefreshToken.iat).toBe(3 * 60); // 3m

    expect(jwt.expiresIn).toBe(jwtConfig.expTime);
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: jwtSecret })],
      providers: [JwtAuthService, PRISMA_MOCK_PROVIDER]
    })
      .useMocker((token) => {
        if (token === ConfigService)
          return {
            getOrThrow: jest.fn((key) => {
              switch (key) {
                case 'jwt.expTime':
                  return jwtConfig.expTime;
                case 'jwt.gameExpTime':
                  return jwtConfig.gameExpTime;
                case 'jwt.refreshExpTime':
                  return jwtConfig.refreshExpTime;
              }
            })
          };
        else return mockDeep(token);
      })
      .compile();

    service = module.get(JwtAuthService);
    db = module.get(EXTENDED_PRISMA_SERVICE);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('loginWeb', () => {
    const user = {
      alias: 'Daniel Plainview',
      avatar: 'milkshake.jpg',
      country: 'US',
      id: 1,
      steamID: 1n,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should generate a web JWT DTO', async () => {
      const jwt = await service.loginWeb({
        id: user.id,
        steamID: user.steamID
      });

      testWebTokenDto(user, jwt);
    });
  });

  describe('loginGame', () => {
    const user = {
      alias: 'Reynolds Woodcock',
      avatar: 'mushrooms.gif',
      country: 'UK',
      steamID: 1n,
      id: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should generate a game JWT DTO', async () => {
      const jwt = await service.loginGame({
        id: user.id,
        steamID: user.steamID
      });

      expect(jwt).toBeValidDto(JWTResponseGameDto);

      const decodedAccessToken = testJwtService.decode(
        jwt.token
      ) as UserJwtAccessPayloadVerified;
      expect(decodedAccessToken).toMatchObject({
        id: user.id,
        steamID: user.steamID.toString(),
        gameAuth: true
      });

      expect(decodedAccessToken.exp - decodedAccessToken.iat).toBe(2 * 60); // 2m
    });
  });

  describe('refreshRefreshToken', () => {
    const user = {
      alias: 'Freddie Quell',
      avatar: 'paintthinner.ico',
      country: 'US',
      id: 1,
      steamID: 1n,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should generate a web JWT DTO for a valid refresh token', async () => {
      const token = testJwtService.sign({ id: user.id });

      db.user.findUnique.mockResolvedValueOnce(user as any);

      const jwt = await service.refreshRefreshToken(token);

      testWebTokenDto(user, jwt);
    });

    it('should throw an UnauthorizedException for an invalid token', async () => {
      const token =
        testJwtService.sign({ id: user.id, steamID: user.steamID }) + 'a';

      await expect(service.refreshRefreshToken(token)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw an UnauthorizedException is the user does not exist in DB', async () => {
      const token = testJwtService.sign({ id: user.id, steamID: user.steamID });

      db.user.findUnique.mockResolvedValueOnce(undefined);
      await expect(service.refreshRefreshToken(token)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
