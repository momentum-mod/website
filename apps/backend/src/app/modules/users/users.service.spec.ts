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
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException
} from '@nestjs/common';
import { User } from '@momentum/db';
import { SteamUserSummaryData } from '../steam/steam.interface';
import { KillswitchService } from '../killswitch/killswitch.service';
import { createHash } from 'node:crypto';
import { Role } from '@momentum/constants';

describe('UserService', () => {
  let usersService: UsersService;
  let killswitchService: KillswitchService;
  let db: PrismaMock;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, PRISMA_MOCK_PROVIDER, KillswitchService]
    })
      .useMocker(mockDeep)
      .compile();
    usersService = module.get(UsersService);
    killswitchService = module.get(KillswitchService);
    await killswitchService.onModuleInit();
    db = module.get(EXTENDED_PRISMA_SERVICE);
  });

  it('should be defined', () => {
    expect(usersService).toBeDefined();
    expect(db).toBeDefined();
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

      await usersService.findOrCreateUser(BigInt(123456789));
    });

    it('should not create a new user if the killswitch is active', async () => {
      await killswitchService.updateKillswitches({
        NEW_SIGNUPS: true,
        MAP_REVIEWS: false,
        MAP_SUBMISSION: false,
        RUN_SUBMISSION: false
      });

      const fakeUser: User = undefined;
      db.user.findUnique.mockResolvedValueOnce(fakeUser as any);

      await expect(
        usersService.findOrCreateUser(BigInt(123456789))
      ).rejects.toThrow(ConflictException);

      // reset killswitches
      await killswitchService.updateKillswitches({
        NEW_SIGNUPS: false,
        MAP_REVIEWS: false,
        MAP_SUBMISSION: false,
        RUN_SUBMISSION: false
      });
    });

    it('should allow existing users to login if killswitch is active', async () => {
      const existingUser: User = {
        id: 81237293,
        roles: 0,
        bans: 0,
        steamID: BigInt(123456789),
        alias: 'old alias',
        avatar: '',
        country: 'AQ',
        createdAt: undefined
      };

      db.user.findUnique.mockResolvedValueOnce(existingUser as any);

      await killswitchService.updateKillswitches({
        NEW_SIGNUPS: true,
        MAP_REVIEWS: false,
        MAP_SUBMISSION: false,
        RUN_SUBMISSION: false
      });

      await usersService.findOrCreateUser(BigInt(123456799n));

      // reset killswitches
      await killswitchService.updateKillswitches({
        NEW_SIGNUPS: false,
        MAP_REVIEWS: false,
        MAP_SUBMISSION: false,
        RUN_SUBMISSION: false
      });
    });

    it('should create a new user', async () => {
      const nonExistingUser: User = undefined;
      db.user.findUnique.mockResolvedValueOnce(nonExistingUser as any);

      const spy = jest.spyOn(db['user'], 'create');

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

      await usersService.findOrCreateUser(BigInt(123456789));

      expect(spy).toHaveBeenCalledWith({
        data: {
          alias: steamUserSummaryData.personaname,
          avatar: steamUserSummaryData.avatarhash.replace('_full.jpg', ''),
          country: steamUserSummaryData.loccountrycode,
          steamID: BigInt(123456789)
        },
        select: { id: true, steamID: true }
      });
    });

    it('should create a limited user when using a limited account if the setting is on', async () => {
      const nonExistingUser: User = undefined;
      db.user.findUnique.mockResolvedValueOnce(nonExistingUser as any);

      const spy = jest.spyOn(db['user'], 'create');

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

      jest
        .spyOn(usersService['config'], 'getOrThrow')
        .mockReturnValueOnce(true);
      jest
        .spyOn(usersService['steamService'], 'isAccountLimited')
        .mockResolvedValueOnce(true);

      await usersService.findOrCreateUser(BigInt(123456789));

      expect(spy).toHaveBeenCalledWith({
        data: {
          alias: steamUserSummaryData.personaname,
          avatar: steamUserSummaryData.avatarhash.replace('_full.jpg', ''),
          country: steamUserSummaryData.loccountrycode,
          steamID: BigInt(123456789),
          roles: Role.LIMITED
        },
        select: { id: true, steamID: true }
      });
    });

    it('should throw an error when getSteamUserSummaryData throws and error', async () => {
      jest
        .spyOn(usersService['steamService'], 'getSteamUserSummaryData')
        .mockRejectedValueOnce('failed to start');
      await expect(
        usersService.findOrCreateUser(BigInt(123456789))
      ).rejects.toThrow(ServiceUnavailableException);
    });

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
        usersService.findOrCreateUser(BigInt(999999999))
      ).rejects.toThrow(BadRequestException);
    });

    it('should error when profile state is not 1', async () => {
      const steamID = 123456789n;
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
        profilestate: 2,
        profileurl: '',
        realname: '',
        steamid: steamID.toString(),
        timecreated: 0
      };
      jest
        .spyOn(usersService['steamService'], 'getSteamUserSummaryData')
        .mockResolvedValueOnce(steamUserSummaryData);

      await expect(usersService.findOrCreateUser(steamID)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should error when steamid is deleted', async () => {
      const steamID = 1239127361928736n;
      const steamIDHash = createHash('sha256')
        .update(steamID.toString())
        .digest('hex');

      db.deletedUser.findUnique.mockResolvedValueOnce({ steamIDHash });

      await expect(usersService.findOrCreateUser(steamID)).rejects.toThrow(
        ForbiddenException
      );
    });
  });
});
