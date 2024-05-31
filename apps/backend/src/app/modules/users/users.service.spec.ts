import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { mockDeep } from 'jest-mock-extended';
import {
  PRISMA_MOCK_PROVIDER,
  PrismaMock
} from '../../../../test/prisma-mock.const';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { BadRequestException } from '@nestjs/common/exceptions/bad-request.exception';
import {
  ForbiddenException,
  InternalServerErrorException,
  ServiceUnavailableException
} from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.interface';
import { SteamUserSummaryData } from '../steam/steam.interface';

describe('UserService', () => {
  let usersService: UsersService;
  let db: PrismaMock;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, PRISMA_MOCK_PROVIDER]
    })
      .useMocker(mockDeep)
      .compile();
    usersService = module.get(UsersService);
    db = module.get(EXTENDED_PRISMA_SERVICE);
  });

  it('should be defined', () => {
    expect(usersService).toBeDefined();
    expect(db).toBeDefined();
  });

  describe('findOrCreateFromGame', () => {
    it("should throw an error when the steamid's don't match", async () => {
      const steamUserSummaryData: SteamUserSummaryData = {
        avatar: '',
        avatarfull: '',
        avatarhash: '',
        avatarmedium: '',
        communityvisibilitystate: 0,
        lastlogoff: 0,
        loccountrycode: '',
        personaname: '',
        personastate: 0,
        personastateflags: 0,
        primaryclanid: '',
        profilestate: 0,
        profileurl: '',
        realname: '',
        timecreated: 0,
        steamid: '123456789'
      };
      jest
        .spyOn(usersService['steamService'], 'getSteamUserSummaryData')
        .mockResolvedValueOnce(steamUserSummaryData);
      await expect(
        usersService.findOrCreateFromGame(BigInt(999999999))
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw an error when getSteamUserSummaryData throws and error', async () => {
      jest
        .spyOn(usersService['steamService'], 'getSteamUserSummaryData')
        .mockRejectedValueOnce('failed to start');
      await expect(
        usersService.findOrCreateFromGame(BigInt(123456789))
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should call findOrCreateUser', async () => {
      const steamUserSummaryData: SteamUserSummaryData = {
        avatar: 'avatar',
        avatarfull: 'avatar full',
        avatarhash: 'avatar hash',
        avatarmedium: 'avatar medium',
        communityvisibilitystate: 0,
        lastlogoff: 1567,
        loccountrycode: 'loc country code',
        personaname: 'persona name',
        personastate: 6534,
        personastateflags: 343,
        primaryclanid: 'primary clan id',
        profilestate: 1,
        profileurl: 'profile url',
        realname: 'real name',
        steamid: '123456789',
        timecreated: 999887
      };
      jest
        .spyOn(usersService['steamService'], 'getSteamUserSummaryData')
        .mockResolvedValueOnce(steamUserSummaryData);
      const spy = jest.spyOn(usersService, 'findOrCreateUser');
      await usersService.findOrCreateFromGame(
        BigInt(steamUserSummaryData.steamid)
      );
      expect(spy).toHaveBeenCalledWith({
        steamID: BigInt(steamUserSummaryData.steamid),
        alias: steamUserSummaryData.personaname,
        avatar: steamUserSummaryData.avatarhash,
        country: steamUserSummaryData.loccountrycode
      });
    });
  });

  describe('findOrCreateFromWeb', () => {
    it('should error when profile state is not 1', async () => {
      await expect(
        usersService.findOrCreateFromWeb({
          avatar: '',
          avatarfull: '',
          avatarhash: '',
          avatarmedium: '',
          communityvisibilitystate: 0,
          lastlogoff: 0,
          loccountrycode: '',
          personaname: '',
          personastate: 0,
          personastateflags: 0,
          primaryclanid: '',
          profilestate: 2,
          profileurl: '',
          realname: '',
          steamid: '',
          timecreated: 0
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should error when steamid is deleted', async () => {
      db.deletedSteamID.findUnique.mockResolvedValueOnce({
        steamID: BigInt(123456789)
      } as any);
      await expect(
        usersService.findOrCreateFromWeb({
          avatar: '',
          avatarfull: '',
          avatarhash: '',
          avatarmedium: '',
          communityvisibilitystate: 0,
          lastlogoff: 0,
          loccountrycode: '',
          personaname: '',
          personastate: 0,
          personastateflags: 0,
          primaryclanid: '',
          profilestate: 1,
          profileurl: '',
          realname: '',
          steamid: '123456789',
          timecreated: 0
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should call findOrCreateUser', async () => {
      const spy = jest.spyOn(usersService, 'findOrCreateUser');
      spy.mockResolvedValueOnce({
        id: 0,
        steamID: 0n
      });
      const steamUserSummaryData: SteamUserSummaryData = {
        avatar: 'avatar',
        avatarfull: 'avatar full',
        avatarhash: 'avatar hash',
        avatarmedium: 'avatar medium',
        communityvisibilitystate: 0,
        lastlogoff: 1567,
        loccountrycode: 'loc country code',
        personaname: 'persona name',
        personastate: 6534,
        personastateflags: 343,
        primaryclanid: 'primary clan id',
        profilestate: 1,
        profileurl: 'profile url',
        realname: 'real name',
        steamid: '123456789',
        timecreated: 999887
      };
      await usersService.findOrCreateFromWeb(steamUserSummaryData);
      expect(spy).toHaveBeenCalledWith({
        steamID: BigInt(steamUserSummaryData.steamid),
        alias: steamUserSummaryData.personaname,
        avatar: steamUserSummaryData.avatarhash,
        country: steamUserSummaryData.loccountrycode
      });
    });

    it('should error when no user is returned by findOrCreateUser', async () => {
      const spy = jest.spyOn(usersService, 'findOrCreateUser');
      spy.mockResolvedValueOnce(undefined);
      await expect(
        usersService.findOrCreateFromWeb({
          avatar: '',
          avatarfull: '',
          avatarhash: '',
          avatarmedium: '',
          communityvisibilitystate: 0,
          lastlogoff: 0,
          loccountrycode: '',
          personaname: '',
          personastate: 0,
          personastateflags: 0,
          primaryclanid: '',
          profilestate: 1,
          profileurl: '',
          realname: '',
          steamid: '123456789',
          timecreated: 0
        })
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findOrCreateUser', () => {
    it('should return an existing user', async () => {
      const existingUser: User = {
        id: 1234,
        roles: 0,
        bans: 0,
        steamID: BigInt(123456789),
        alias: 'old alias',
        avatar: '',
        country: 'QA',
        createdAt: undefined
      };
      db.user.findUnique.mockResolvedValueOnce(existingUser as any);
      const authUser: AuthenticatedUser = {
        id: 1234,
        steamID: 123456789n
      };
      db.user.update.mockResolvedValueOnce(authUser as any);

      const userData = {
        steamID: BigInt(123456789),
        alias: 'new alias',
        avatar: 'new avatar',
        country: 'new country'
      };
      const spy = jest.spyOn(db['user'], 'update');
      await usersService.findOrCreateUser(userData);
      expect(spy).toHaveBeenCalledWith({
        where: { id: existingUser.id },
        data: {
          alias: existingUser.alias,
          avatar: userData.avatar.replace('_full.jpg', ''),
          country: existingUser.country
        },
        select: { id: true, steamID: true }
      });
    });

    it('should create a new user', async () => {
      const nonExistingUser: User = undefined;
      db.user.findUnique.mockResolvedValueOnce(nonExistingUser as any);

      const spy = jest.spyOn(db['user'], 'create');

      const userData = {
        steamID: BigInt(123456789),
        alias: 'alias',
        avatar: 'avatar',
        country: 'country'
      };
      await usersService.findOrCreateUser(userData);

      expect(spy).toHaveBeenCalledWith({
        data: {
          alias: userData.alias,
          avatar: userData.avatar.replace('_full.jpg', ''),
          country: userData.country,
          steamID: userData.steamID
        },
        select: { id: true, steamID: true }
      });
    });

    it('should throw error when using a limited account if the setting is on', async () => {
      const nonExistingUser: User = undefined;
      db.user.findUnique.mockResolvedValueOnce(nonExistingUser as any);

      jest
        .spyOn(usersService['config'], 'getOrThrow')
        .mockReturnValueOnce(true);
      jest
        .spyOn(usersService['steamService'], 'isAccountLimited')
        .mockResolvedValueOnce(true);

      const userData = {
        steamID: BigInt(123456789),
        alias: '',
        avatar: '',
        country: ''
      };
      await expect(usersService.findOrCreateUser(userData)).rejects.toThrow(
        ForbiddenException
      );
    });
  });
});
