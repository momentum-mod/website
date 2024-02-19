import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException
} from '@nestjs/common';
import {
  Follow,
  LeaderboardRun,
  MapFavorite,
  MMap,
  Prisma,
  User,
  UserAuth
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import {
  ActivityType,
  AdminActivityType,
  Ban,
  Role,
  UserMapFavoritesGetExpand,
  UserMapLibraryGetExpand
} from '@momentum/constants';
import { Bitflags } from '@momentum/bitflags';
import { expandToIncludes, isEmpty, undefinedIfEmpty } from '@momentum/util-fn';
import { SteamService } from '../steam/steam.service';
import {
  ActivityDto,
  DtoFactory,
  FollowDto,
  FollowStatusDto,
  MapCreditDto,
  MapFavoriteDto,
  MapLibraryEntryDto,
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
import { SteamUserSummaryData } from '../steam/steam.interface';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { AdminActivityService } from '../admin/admin-activity.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly steamService: SteamService,
    private readonly config: ConfigService,
    private readonly adminActivityService: AdminActivityService
  ) {}

  //#region Main User Functions

  async getAll(query: UsersGetAllQueryDto): Promise<PagedResponseDto<UserDto>> {
    const where: Prisma.UserWhereInput = {};

    if (query.steamID && query.steamIDs)
      throw new BadRequestException(
        'Only one of steamID and steamIDs may be used at the same time'
      );

    let take = query.take;
    if (query.steamID) {
      take = 1;
      where.steamID = BigInt(query.steamID);
    } else if (query.steamIDs) {
      where.steamID = { in: query.steamIDs.map(BigInt) };
    }

    if (query.search) {
      where.alias = {
        startsWith: query.search,
        mode: 'insensitive'
      };
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

  async findOrCreateFromGame(steamID: bigint): Promise<AuthenticatedUser> {
    const summaryData = await this.steamService
      .getSteamUserSummaryData(steamID)
      .catch((_) => {
        throw new ServiceUnavailableException(
          'Failed to get player summary data from Steam'
        );
      });

    if (steamID !== BigInt(summaryData.steamid))
      throw new BadRequestException(
        'User fetched is not the authenticated user!'
      );

    const profile = {
      steamID,
      alias: summaryData.personaname,
      avatar: summaryData.avatarhash,
      country: summaryData.loccountrycode
    };

    return this.findOrCreateUser(profile);
  }

  async findOrCreateFromWeb(
    profile: SteamUserSummaryData
  ): Promise<AuthenticatedUser> {
    if (profile.profilestate !== 1)
      throw new ForbiddenException(
        'We do not authenticate Steam accounts without a profile. Set up your community profile on Steam!'
      );

    const deletedSteamID = await this.db.deletedSteamID.findUnique({
      where: { steamID: BigInt(profile.steamid) }
    });

    if (deletedSteamID)
      throw new ForbiddenException('Account with this SteamID was deleted.');

    const user = await this.findOrCreateUser({
      steamID: BigInt(profile.steamid),
      alias: profile.personaname,
      avatar: profile.avatarhash,
      country: profile.loccountrycode
    });

    if (!user)
      throw new InternalServerErrorException('Could not get or create user');

    return user;
  }

  async findOrCreateUser(
    userData: Pick<User, 'steamID' | 'alias' | 'avatar' | 'country'>
  ): Promise<AuthenticatedUser> {
    const user = await this.db.user.findUnique({
      where: { steamID: userData.steamID }
    });

    const input: Prisma.UserUpdateInput | Prisma.UserCreateInput = {
      alias: userData.alias,
      avatar: userData.avatar.replace('_full.jpg', ''),
      country: userData.country
    };

    if (user) {
      return await this.db.user.update({
        where: { id: user.id },
        data: input as Prisma.UserUpdateInput,
        select: { id: true, steamID: true }
      });
    } else {
      if (
        this.config.getOrThrow('steam.preventLimited') &&
        (await this.steamService.isAccountLimited(userData.steamID))
      )
        throw new ForbiddenException(
          'We do not authenticate limited Steam accounts. Buy something on Steam first!'
        );

      input.steamID = userData.steamID;

      return await this.db.user.create({
        data: input as Prisma.UserCreateInput,
        select: { id: true, steamID: true }
      });
    }
  }

  async update(userID: number, update: UpdateUserDto) {
    if (isEmpty(update)) {
      throw new BadRequestException('Empty body');
    }
    const user = await this.db.user.findUnique({
      where: { id: userID },
      include: { profile: true }
    });

    const updateInput: Prisma.UserUpdateInput = {};

    // Strict check - we want to handle if alias is empty string
    if (update.alias !== undefined) {
      if (Bitflags.has(user.bans, Ban.ALIAS)) {
        throw new ForbiddenException(
          'User is banned from updating their alias'
        );
      } else {
        updateInput.alias = update.alias;
      }

      if (Bitflags.has(user.roles, Role.VERIFIED)) {
        const sameNameMatches = await this.db.user.findMany({
          where: { alias: update.alias },
          select: { roles: true }
        });
        if (
          sameNameMatches.some((user) =>
            Bitflags.has(user.roles, Role.VERIFIED)
          )
        )
          throw new ConflictException(
            'Alias is in use by another verified user'
          );
      }
    }

    if (update.bio) {
      if (Bitflags.has(user.bans, Ban.BIO)) {
        throw new ForbiddenException('User is banned from updating their bio');
      } else {
        updateInput.profile = { update: { bio: update.bio } };
      }
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

    await this.db.user.update({ where: { id: userID }, data: updateInput });
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
      mapLibraryEntries: { deleteMany: {} },
      activities: { deleteMany: {} },
      follows: { deleteMany: {} },
      followers: { deleteMany: {} },
      notifications: { deleteMany: {} },
      runSessions: { deleteMany: {} }
    };

    const [deletedUser] = await this.db.$transaction([
      this.db.user.update({
        where: { id: userID },
        data: updateInputToClean
      }),
      this.db.userAuth.deleteMany({ where: { userID } }),
      this.db.deletedSteamID.create({ data: { steamID: user.steamID } })
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

  //#region Map Library

  async getMapLibraryEntries(
    userID: number,
    skip: number,
    take: number,
    search: string,
    expand: UserMapLibraryGetExpand
  ): Promise<PagedResponseDto<MapLibraryEntryDto>> {
    const include: Prisma.MapLibraryEntryInclude = {
      mmap: {
        include: expandToIncludes(expand, {
          mappings: [
            {
              expand: 'inFavorites',
              model: 'favorites',
              value: { where: { userID } }
            }
          ]
        })
      },
      user: true
    };

    const where: Prisma.MapLibraryEntryWhereInput = { userID };
    if (search) where.mmap = { name: { contains: search } };

    const dbResponse = await this.db.mapLibraryEntry.findManyAndCount({
      where,
      include,
      skip,
      take
    });

    return new PagedResponseDto(MapLibraryEntryDto, dbResponse);
  }

  async addMapLibraryEntry(userID: number, mapID: number) {
    if (!(await this.db.mMap.exists({ where: { id: mapID } })))
      throw new NotFoundException('Target map not found');

    await this.db.mapLibraryEntry.upsert({
      where: { mapID_userID: { userID, mapID } },
      create: { userID, mapID },
      update: {}
    });
  }

  async removeMapLibraryEntry(userID: number, mapID: number) {
    if (!(await this.db.mMap.exists({ where: { id: mapID } })))
      throw new NotFoundException("Target map doesn't exist");

    await this.db.mapLibraryEntry
      .delete({ where: { mapID_userID: { userID, mapID } } })
      .catch(() => {
        throw new NotFoundException('Target map not in users library');
      });
  }

  //#endregion

  //#region Map Favorites

  async getFavoritedMaps(
    userID: number,
    skip: number,
    take: number,
    search: string,
    expand?: UserMapFavoritesGetExpand
  ) {
    const where: Prisma.MapFavoriteWhereInput = { userID: userID };

    const include: Prisma.MapFavoriteInclude = { user: true };

    if (search) {
      where.mmap = { name: { contains: search } };
      include.mmap = true;
    }

    const mapIncludes: Prisma.MMapInclude = expandToIncludes(expand, {
      mappings: [
        {
          expand: 'inLibrary',
          model: 'libraryEntries',
          value: { where: { userID } }
        },
        {
          expand: 'personalBest',
          model: 'leaderboardRuns',
          value: { where: { userID } }
        }
      ]
    });

    if (!isEmpty(mapIncludes)) {
      include.mmap = { include: mapIncludes };
    }

    const dbResponse: [
      (MapFavorite & { mmap?: MMap & { personalBest?: LeaderboardRun } })[],
      number
    ] = await this.db.mapFavorite.findManyAndCount({
      where,
      include,
      skip,
      take
    });

    if (expand?.includes('personalBest')) {
      for (const { mmap } of dbResponse[0] as (MapFavorite & {
        mmap?: MMap & {
          personalBest?: LeaderboardRun;
          leaderboardRuns?: LeaderboardRun[];
        };
      })[]) {
        mmap.personalBest = mmap.leaderboardRuns[0];
        delete mmap.leaderboardRuns;
      }
    }

    return new PagedResponseDto(MapFavoriteDto, dbResponse);
  }

  async checkFavoritedMap(userID: number, mapID: number) {
    const dbResponse = await this.db.mapFavorite.findUnique({
      where: { mapID_userID: { userID, mapID } }
    });

    if (!dbResponse) throw new NotFoundException('Target map not found');

    return dbResponse;
  }

  async addFavoritedMap(userID: number, mapID: number) {
    if (!(await this.db.mMap.exists({ where: { id: mapID } })))
      throw new NotFoundException('Target map not found');

    await this.db.mapFavorite.create({ data: { userID, mapID } });
  }

  async removeFavoritedMap(userID: number, mapID: number) {
    if (!(await this.db.mMap.exists({ where: { id: mapID } })))
      throw new NotFoundException('Target map not found');

    await this.db.mapFavorite
      .delete({ where: { mapID_userID: { userID, mapID } } })
      .catch(() => {
        throw new NotFoundException("Target map is not in user's favorites");
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
    take?: number
  ): Promise<PagedResponseDto<MapCreditDto>> {
    let include: Prisma.MapCreditInclude;
    if (expand?.length > 0) {
      include = {};
      // Other expands are nested properties of the map, if anything but just
      // 'map', it'll be a more complex include object, which trivially includes
      // the map
      if (expand[0] === 'map' && expand.length === 1) include.mmap = true;
      else {
        include.mmap = { include: {} };
        if (expand.includes('info')) include.mmap.include.info = true;
        if (expand.includes('thumbnail')) include.mmap.include.thumbnail = true;
      }
    }

    const dbResponse = await this.db.mapCredit.findManyAndCount({
      where: { userID },
      include,
      skip,
      take
    });

    return new PagedResponseDto(MapCreditDto, dbResponse);
  }

  //#endregion
}
