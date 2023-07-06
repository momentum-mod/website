import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthService } from './jwt-auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JWTResponseGameDto, JWTResponseWebDto } from '@momentum/backend/dto';
import {
  UserJwtAccessPayloadVerified,
  UserJwtPayloadVerified
} from '../auth.interface';
import { DbService } from '../../database/db.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('JwtAuthService', () => {
  let service: JwtAuthService, db: DeepMockProxy<DbService>;

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
      providers: [JwtAuthService]
    })
      .useMocker((token) => {
        if (token === ConfigService)
          return {
            get: jest.fn((key) => {
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
    db = module.get(DbService);
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
      db.userAuth.upsert.mockResolvedValueOnce(undefined);

      const jwt = await service.loginWeb({
        id: user.id,
        steamID: user.steamID
      });

      expect(db.userAuth.upsert).toHaveBeenCalledWith({
        where: { userID: user.id },
        update: { refreshToken: jwt.refreshToken },
        create: { userID: user.id, refreshToken: jwt.refreshToken }
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

  describe('revokeRefreshToken', () => {
    const user = {
      alias: 'Barry Egan',
      avatar: 'pudding.png',
      country: 'US',
      id: 1,
      roles: 0,
      bans: 0,
      steamID: 1n,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should revoke a valid refresh token', async () => {
      const token = testJwtService.sign({ id: user.id });

      db.user.findUnique.mockResolvedValueOnce(user as any);
      db.userAuth.upsert.mockResolvedValueOnce(undefined);

      await service.revokeRefreshToken(token);

      expect(db.userAuth.upsert).toHaveBeenCalledWith({
        where: { userID: user.id },
        update: { refreshToken: '' },
        create: { userID: user.id, refreshToken: '' }
      });
    });

    it('should throw an UnauthorizedException for an invalid token', async () => {
      const token = testJwtService.sign({ id: user.id }) + 'a';

      await expect(service.revokeRefreshToken(token)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw an UnauthorizedException is the user does not exist in DB', async () => {
      const token = testJwtService.sign({ id: user.id });

      db.user.findUnique.mockResolvedValueOnce(undefined);
      await expect(service.revokeRefreshToken(token)).rejects.toThrow(
        UnauthorizedException
      );
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
      db.userAuth.upsert.mockResolvedValueOnce(undefined);

      const jwt = await service.refreshRefreshToken(token);

      expect(db.userAuth.upsert).toHaveBeenCalledWith({
        where: { userID: user.id },
        update: { refreshToken: jwt.refreshToken },
        create: { userID: user.id, refreshToken: jwt.refreshToken }
      });

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
