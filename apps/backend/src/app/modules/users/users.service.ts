import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from '@nestjs/common';
import { Follow, Prisma, UserAuth } from '@momentum/db';
import { ConfigService } from '@nestjs/config';
import {
  ActivityType,
  AdminActivityType,
  Ban,
  CombinedRoles,
  MapStatus,
  Role,
  NON_WHITESPACE_REGEXP,
  KillswitchType
} from '@momentum/constants';
import * as Bitflags from '@momentum/bitflags';
import { expandToIncludes, isEmpty, undefinedIfEmpty } from '@momentum/util-fn';
import { SteamService } from '../steam/steam.service';
import {
  ActivityDto,
  DtoFactory,
  FollowDto,
  FollowStatusDto,
  MapCreditDto,
  MapNotifyDto,
  PagedResponseDto,
  ProfileDto,
  UpdateFollowStatusDto,
  UpdateMapNotifyDto,
  UpdateUserDto,
  UserDto,
  UsersGetAllQueryDto
} from '../../dto';
import { AuthenticatedUser } from '../auth/auth.interface';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { AdminActivityService } from '../admin/admin-activity.service';
import { KillswitchService } from '../killswitch/killswitch.service';
import { SteamUserSummaryData } from '../steam/steam.interface';
import { createHash } from 'node:crypto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly killswitchService: KillswitchService,
    private readonly steamService: SteamService,
    private readonly config: ConfigService,
    private readonly adminActivityService: AdminActivityService
  ) {}

  //#region Main User Functions

  async getAll(query: UsersGetAllQueryDto): Promise<PagedResponseDto<UserDto>> {
    const where: Prisma.UserWhereInput = {};

    let take = query.take;
    if (query.steamID) {
      take = 1;
      where.steamID = BigInt(query.steamID);
    } else if (query.steamIDs) {
      where.steamID = { in: query.steamIDs.map(BigInt) };
    } else if (query.userIDs) {
      where.id = { in: query.userIDs };
    } else if (query.search) {
      const dbResponse = await this.db.$transaction([
        this.db.$queryRawTyped(
          this.db.typedQueries.searchUsers(query.search, query.skip ?? 0, take)
        ),
        this.db.user.count({
          where: {
            ...where,
            alias: { contains: query.search, mode: 'insensitive' }
          }
        })
      ]);
      return new PagedResponseDto(UserDto, dbResponse);
    }

    const include: Prisma.UserInclude = expandToIncludes(query.expand) ?? {};

    const dbResponse = await this.db.user.findManyAndCount({
      where,
      include: undefinedIfEmpty(include),
      skip: query.skip,
      take
    });

    return new PagedResponseDto(UserDto, dbResponse);
  }

  async get(id: number, expand?: string[]): Promise<UserDto> {
    const include: Prisma.UserInclude = expandToIncludes(expand) ?? {};

    const dbResponse: any = await this.db.user.findUnique({
      where: { id },
      include: undefinedIfEmpty(include)
    });

    if (!dbResponse) throw new NotFoundException('User not found');

    return DtoFactory(UserDto, dbResponse);
  }

  async findOrCreateUser(steamID: bigint): Promise<AuthenticatedUser> {
    const deletedSteamID = await this.db.deletedUser.findUnique({
      where: { steamIDHash: this.getSteamIDHash(steamID) }
    });

    if (deletedSteamID)
      throw new ForbiddenException('Account with this SteamID was deleted.');

    const user = await this.db.user.findUnique({
      where: { steamID },
      select: {
        id: true,
        steamID: true,
        alias: true,
        avatar: true,
        country: true,
        roles: true
      }
    });

    if (user) {
      if (Bitflags.has(user.roles, Role.LIMITED)) {
        const isLimited = await this.steamService.isAccountLimited(steamID);
        if (!isLimited) {
          await this.db.user.update({
            where: { steamID },
            data: { roles: Bitflags.remove(user.roles, Role.LIMITED) }
          });
        }
      }

      return user;
    } else if (
      this.killswitchService.checkKillswitch(KillswitchType.NEW_SIGNUPS)
    ) {
      throw new ConflictException('New signups are disabled temporarily');
    } else {
      const userData = await this.steamService
        .getSteamUserSummaryData(steamID)
        .catch((_) => {
          throw new ServiceUnavailableException(
            'Failed to get player summary data from Steam'
          );
        });

      if (steamID !== BigInt(userData.steamid))
        throw new BadRequestException(
          'User fetched is not the authenticated user!'
        );

      if (userData.profilestate !== 1)
        throw new ForbiddenException(
          'We do not authenticate Steam accounts without a profile. Set up your community profile on Steam!'
        );

      let roles = undefined;
      if (
        this.config.getOrThrow('steam.preventLimited') &&
        (await this.steamService.isAccountLimited(steamID))
      )
        roles = Role.LIMITED;

      return await this.db.user.create({
        data: {
          steamID,
          alias: userData.personaname,
          avatar: userData.avatarhash.replace('_full.jpg', ''),
          country: userData.loccountrycode,
          roles
        },
        select: { id: true, steamID: true }
      });
    }
  }

  async update(userID: number, update: UpdateUserDto, asAdmin?: boolean) {
    if (isEmpty(update)) {
      throw new BadRequestException('Empty body');
    }
    const user = await this.db.user.findUnique({
      where: { id: userID },
      include: { profile: true }
    });

    const updateInput: Prisma.UserUpdateInput = {};
    let userData: SteamUserSummaryData;

    // Strict check - we want to handle if alias is empty string
    if (update.alias !== undefined) {
      if (Bitflags.has(user.bans, Ban.ALIAS) && !asAdmin) {
        throw new ForbiddenException(
          'User is banned from updating their alias'
        );
      }

      // Reset alias to steam name
      if (update.alias === '') {
        if (!userData)
          userData = await this.steamService.getSteamUserSummaryData(
            user.steamID
          );
        update.alias = userData.personaname;
      }

      if (!NON_WHITESPACE_REGEXP.test(update.alias)) {
        throw new BadRequestException('Invalid alias');
      }

      updateInput.alias = update.alias;

      if (Bitflags.has(user.roles, Role.VERIFIED)) {
        const sameNameMatches = await this.db.user.findMany({
          where: { alias: update.alias, NOT: { id: userID } },
          select: { roles: true }
        });
        if (
          sameNameMatches.some((user) =>
            Bitflags.has(user.roles, Role.VERIFIED)
          )
        )
          throw new ConflictException(
            'Cannot update to new alias as it is already used by another verified user'
          );
      }
    }

    // Same as above
    if (update.bio !== undefined) {
      if (Bitflags.has(user.bans, Ban.BIO) && !asAdmin) {
        throw new ForbiddenException('User is banned from updating their bio');
      } else {
        updateInput.profile = { update: { bio: update.bio } };
      }
    }

    if (update.resetAvatar) {
      if (!userData)
        userData = await this.steamService.getSteamUserSummaryData(
          user.steamID
        );
      updateInput.avatar = userData.avatarhash.replace('_full.jpg', '');
    }

    if (update.country) {
      updateInput.country = update.country;
    }

    // Note implementing any ban checks here, since our current bans system
    // doesn't make sense - would we really want a ban *specifically* for
    // blocking updating socials? Started a gdoc, waiting til we write full spec
    if (update.socials) {
      // Delete empty string values - no point storing
      for (const [k, v] of Object.entries(update.socials)) {
        if (v === '') delete update.socials[k];
      }

      if (updateInput.profile?.update) {
        updateInput.profile.update.socials = update.socials;
      } else {
        updateInput.profile = { update: { socials: update.socials } };
      }
    }

    return await this.db.user.update({
      where: { id: userID },
      data: updateInput,
      include: { profile: true }
    });
  }

  async delete(userID: number, adminID?: number) {
    const user = await this.db.user.findUnique({
      where: { id: userID }
    });

    if (!user) throw new NotFoundException('Could not find the user');
    if (Bitflags.has(user.roles, Role.DELETED)) return;

    const updateInputToClean: Prisma.UserUpdateInput = {
      roles: Role.DELETED,
      steamID: null,
      alias: 'Deleted User',
      avatar: null,
      country: null,
      profile: { update: { bio: '', socials: {} } },
      mapFavorites: { deleteMany: {} },
      activities: { deleteMany: {} },
      follows: { deleteMany: {} },
      followers: { deleteMany: {} },
      notifications: { deleteMany: {} }
    };

    const [deletedUser] = await this.db.$transaction([
      this.db.user.update({
        where: { id: userID },
        data: updateInputToClean
      }),
      this.db.userAuth.deleteMany({ where: { userID } }),
      this.db.deletedUser.create({
        data: { steamIDHash: this.getSteamIDHash(user.steamID) }
      })
    ]);

    if (adminID) {
      await this.adminActivityService.create(
        adminID,
        AdminActivityType.USER_DELETE,
        userID,
        deletedUser,
        user
      );
    }
  }

  //#endregion

  //#region Auth

  getAuth(userID: number): Promise<UserAuth> {
    return this.db.userAuth.findUnique({ where: { userID } });
  }

  //#endregion

  //#region Profile

  async getProfile(userID: number): Promise<ProfileDto> {
    const dbResponse = await this.db.profile.findUnique({ where: { userID } });

    if (!dbResponse) throw new NotFoundException();

    return DtoFactory(ProfileDto, dbResponse);
  }

  //#endregion

  //#region Activities

  async getActivities(
    userID: number,
    skip?: number,
    take?: number,
    type?: ActivityType,
    data?: number
  ): Promise<PagedResponseDto<ActivityDto>> {
    const dbResponse = await this.db.activity.findManyAndCount({
      where: {
        userID,
        AND: [{ type }, { type: { not: ActivityType.REPORT_FILED } }],
        data
      },
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });

    return new PagedResponseDto(ActivityDto, dbResponse);
  }

  async getFollowedActivities(
    userID: number,
    skip?: number,
    take?: number,
    type?: ActivityType,
    data?: number
  ): Promise<PagedResponseDto<ActivityDto>> {
    const follows = await this.db.follow.findMany({
      where: { followeeID: userID },
      select: { followedID: true }
    });

    const dbResponse = await this.db.activity.findManyAndCount({
      where: {
        userID: { in: follows.map((follow) => follow.followedID) },
        type,
        data
      },
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });

    return new PagedResponseDto(ActivityDto, dbResponse);
  }

  //#endregion

  //#region Follows

  async getFollowers(
    id: number,
    skip?: number,
    take?: number
  ): Promise<PagedResponseDto<FollowDto>> {
    const dbResponse = await this.db.follow.findManyAndCount({
      where: { followedID: id },
      include: {
        followee: { include: { profile: true } },
        followed: { include: { profile: true } }
      },
      skip,
      take
    });

    return new PagedResponseDto(FollowDto, dbResponse);
  }

  async getFollowing(
    id: number,
    skip?: number,
    take?: number
  ): Promise<PagedResponseDto<FollowDto>> {
    const dbResponse = await this.db.follow.findManyAndCount({
      where: { followeeID: id },
      include: {
        followee: { include: { profile: true } },
        followed: { include: { profile: true } }
      },
      skip,
      take
    });

    return new PagedResponseDto(FollowDto, dbResponse);
  }

  async getFollowStatus(
    localUserID: number,
    targetUserID: number
  ): Promise<FollowStatusDto> {
    if (!(await this.db.user.exists({ where: { id: targetUserID } })))
      throw new NotFoundException('Target user not found');

    const localToTarget = await this.getFollower(localUserID, targetUserID);
    const targetToLocal = await this.getFollower(targetUserID, localUserID);

    return DtoFactory(FollowStatusDto, {
      local: localToTarget,
      target: targetToLocal
    });
  }

  async followUser(
    localUserID: number,
    targetUserID: number
  ): Promise<FollowDto> {
    if (!(await this.db.user.exists({ where: { id: targetUserID } })))
      throw new NotFoundException('Target user not found');

    if (localUserID === targetUserID)
      throw new BadRequestException('Target user cannot be logged in user');

    const isFollowing = await this.getFollower(localUserID, targetUserID);
    if (isFollowing)
      throw new BadRequestException(
        'User is already following the target user'
      );

    const dbResponse = await this.db.follow.create({
      data: { followeeID: localUserID, followedID: targetUserID }
    });

    return DtoFactory(FollowDto, dbResponse);
  }

  async followUsers(userID: number, usersIDs: number[]): Promise<FollowDto[]> {
    const users = await this.db.user.findMany({
      where: { id: { in: usersIDs } }
    });

    if (users.length !== usersIDs.length)
      throw new NotFoundException('One or more users not found');

    if (usersIDs.includes(userID)) {
      throw new BadRequestException('User cannot follow themselves');
    }

    const existingFollows = await this.db.follow.findMany({
      where: {
        followeeID: userID,
        followedID: { in: usersIDs }
      }
    });

    if (existingFollows.length > 0) {
      throw new BadRequestException(
        'User is already following one or more of the target users'
      );
    }

    const createdFollows = await this.db.follow.createManyAndReturn({
      data: usersIDs.map((followedID) => ({
        followeeID: userID,
        followedID
      }))
    });

    return createdFollows.map((follow) => DtoFactory(FollowDto, follow));
  }

  async updateFollow(
    localUserID: number,
    targetUserID: number,
    updateDto: UpdateFollowStatusDto
  ) {
    if (!updateDto) return;

    if (
      !(await this.db.user.exists({
        where: { id: targetUserID }
      }))
    )
      throw new NotFoundException('Target user not found');

    await this.db.follow.update({
      where: {
        followeeID_followedID: {
          followeeID: localUserID,
          followedID: targetUserID
        }
      },
      data: { notifyOn: updateDto.notifyOn }
    });
  }

  async unfollowUser(localUserID: number, targetUserID: number) {
    if (
      !(await this.db.user.exists({
        where: { id: targetUserID }
      }))
    )
      throw new NotFoundException('Target user not found');

    // Prisma errors on trying to delete an entry that does not exist
    // (https://github.com/prisma/prisma/issues/4072), where we want to just 404.
    await this.db.follow
      .delete({
        where: {
          followeeID_followedID: {
            followeeID: localUserID,
            followedID: targetUserID
          }
        }
      })
      .catch(() => {
        throw new NotFoundException('Target follow does not exist');
      });
  }

  private getFollower(followeeID: number, followedID: number): Promise<Follow> {
    return this.db.follow.findUnique({
      where: {
        followeeID_followedID: {
          followedID: followedID,
          followeeID: followeeID
        }
      },
      include: {
        followed: true,
        followee: true
      }
    });
  }

  //#endregion

  //#region Map Favorites

  async checkFavoritedMap(userID: number, mapID: number) {
    const dbResponse = await this.db.mapFavorite.findUnique({
      where: { mapID_userID: { userID, mapID } }
    });

    if (!dbResponse) throw new GoneException('Map is not favorited');

    return;
  }

  async addFavoritedMap(userID: number, mapID: number) {
    if (!(await this.db.mMap.exists({ where: { id: mapID } })))
      throw new NotFoundException('Target map not found');

    await this.db.mapFavorite.create({ data: { userID, mapID } }).catch(() => {
      throw new BadRequestException(
        "Target map is already in the user's favorites"
      );
    });

    await this.db.mapStats.update({
      where: { mapID },
      data: { favorites: { increment: 1 } }
    });
  }

  async removeFavoritedMap(userID: number, mapID: number) {
    if (!(await this.db.mMap.exists({ where: { id: mapID } })))
      throw new NotFoundException('Target map not found');

    await this.db.mapFavorite
      .delete({ where: { mapID_userID: { userID, mapID } } })
      .catch(() => {
        throw new BadRequestException("Target map is not in user's favorites");
      });

    await this.db.mapStats.update({
      where: { mapID },
      data: { favorites: { decrement: 1 } }
    });
  }

  //#endregion

  //#region Map Notify

  async getMapNotifyStatus(
    userID: number,
    mapID: number
  ): Promise<MapNotifyDto> {
    if (!(await this.db.mMap.exists({ where: { id: mapID } })))
      throw new NotFoundException('Target map not found');

    const dbResponse = await this.db.mapNotify.findUnique({
      where: { userID_mapID: { userID, mapID } }
    });

    if (!dbResponse)
      throw new NotFoundException('User has no notifications for this map');

    return DtoFactory(MapNotifyDto, dbResponse);
  }

  async updateMapNotify(
    userID: number,
    mapID: number,
    updateDto: UpdateMapNotifyDto
  ) {
    if (!updateDto || !updateDto.notifyOn)
      throw new BadRequestException(
        'Request does not contain valid notification type data'
      );

    if (!(await this.db.mMap.exists({ where: { id: mapID } })))
      throw new NotFoundException('Target map not found');

    await this.db.mapNotify.upsert({
      where: { userID_mapID: { userID, mapID } },
      update: { notifyOn: updateDto.notifyOn },
      create: { notifyOn: updateDto.notifyOn, mapID, userID }
    });
  }

  async removeMapNotify(userID: number, mapID: number) {
    if (!(await this.db.mMap.exists({ where: { id: mapID } })))
      throw new NotFoundException('Target map not found');

    await this.db.mapNotify
      .delete({ where: { userID_mapID: { userID: userID, mapID: mapID } } })
      .catch(() => {
        throw new NotFoundException('Target map notification does not exist');
      });
  }

  //#endregion

  //#region Credits

  async getMapCredits(
    userID: number,
    expand?: string[],
    skip?: number,
    take?: number,
    localUserID?: number
  ): Promise<PagedResponseDto<MapCreditDto>> {
    let include: Prisma.MapCreditInclude;
    const where: Prisma.MapCreditWhereInput = {
      userID,
      mmap: { status: MapStatus.APPROVED }
    };
    if (expand?.length > 0) {
      include = {};
      // Other expands are nested properties of the map, if anything but just
      // 'map', it'll be a more complex include object, which trivially includes
      // the map
      if (expand[0] === 'map' && expand.length === 1) include.mmap = true;
      else {
        include.mmap = { include: {} };
        if (expand.includes('info')) include.mmap.include.info = true;
      }
    }

    const localUser = localUserID
      ? await this.db.user.findUnique({
          where: { id: localUserID }
        })
      : null;

    if (
      localUserID === userID ||
      (localUserID && Bitflags.has(localUser.roles, CombinedRoles.MOD_OR_ADMIN))
    ) {
      delete where.mmap;
    }

    const dbResponse = await this.db.mapCredit.findManyAndCount({
      where,
      include,
      skip,
      take
    });

    return new PagedResponseDto(MapCreditDto, dbResponse);
  }

  async findSteamFriends(userID: number, steamID: bigint): Promise<UserDto[]> {
    const steamFriends = await this.steamService.getSteamFriends(steamID);
    const steamIDs = steamFriends.map((friend) => BigInt(friend.steamid));

    const users = await this.db.user.findMany({
      where: {
        steamID: { in: steamIDs },
        followers: { none: { followeeID: userID } }
      }
    });

    return users.map((user) => DtoFactory(UserDto, user));
  }

  private getSteamIDHash(steamID: bigint): string {
    return createHash('sha256').update(steamID.toString()).digest('hex');
  }

  //#endregion
}
