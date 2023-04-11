import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    ServiceUnavailableException
} from '@nestjs/common';
import { Prisma, User, UserAuth } from '@prisma/client';
import { UpdateUserDto, UserDto } from '@common/dto/user/user.dto';
import { ProfileDto } from '@common/dto/user/profile.dto';
import { PaginatedResponseDto } from '@common/dto/paginated-response.dto';
import { UsersRepoService } from '../repo/users-repo.service';
import { ActivityDto } from '@common/dto/user/activity.dto';
import { FollowDto, FollowStatusDto, UpdateFollowStatusDto } from '@common/dto/user/follow.dto';
import { MapCreditDto } from '@common/dto/map/map-credit.dto';
import { ActivityTypes } from '@common/enums/activity.enum';
import { DtoFactory, ExpandToPrismaIncludes } from '@lib/dto.lib';
import { MapNotifyDto, UpdateMapNotifyDto } from '@common/dto/map/map-notify.dto';
import { MapsRepoService } from '../repo/maps-repo.service';
import { NotificationDto, UpdateNotificationDto } from '@common/dto/user/notification.dto';
import { MapLibraryEntryDto } from '@common/dto/map/map-library-entry';
import { MapFavoriteDto } from '@common/dto/map/map-favorite.dto';
import { ConfigService } from '@nestjs/config';
import { UsersGetAllQuery } from '@common/dto/query/user-queries.dto';
import { MapDto } from '@common/dto/map/map.dto';
import { MapSummaryDto } from '@common/dto/user/user-maps-summary.dto';
import { SteamUserSummaryData } from '@modules/steam/steam.interface';
import { SteamService } from '@modules/steam/steam.service';
import { AuthenticatedUser } from '@modules/auth/auth.interface';

@Injectable()
export class UsersService {
    constructor(
        private readonly userRepo: UsersRepoService,
        private readonly mapRepo: MapsRepoService,
        private readonly steamService: SteamService,
        private readonly config: ConfigService
    ) {}

    //#region Main User Functions

    async getAll(query: UsersGetAllQuery): Promise<PaginatedResponseDto<UserDto>> {
        const where: Prisma.UserWhereInput = {};

        if (query.steamID && query.steamIDs)
            throw new BadRequestException('Only one of steamID and steamIDs may be used at the same time');

        if (query.steamID) {
            query.take = 1;
            where.steamID = query.steamID;
        } else if (query.steamIDs) {
            where.steamID = { in: query.steamIDs };
        }

        if (query.search) where.alias = { startsWith: query.search };

        let include: Prisma.UserInclude = ExpandToPrismaIncludes(query.expand);

        if (query.mapRank) {
            include ??= {};

            include.mapRanks = { where: { mapID: query.mapRank }, include: { run: true } };
        }

        const dbResponse = await this.userRepo.getAll(where, include, query.skip, query.take);

        for (const user of dbResponse[0] as any[]) {
            if (user.mapRanks) {
                user.mapRank = user.mapRanks[0];
                delete user.mapRanks;
            }
        }

        return new PaginatedResponseDto(UserDto, dbResponse);
    }

    async get(id: number, expand?: string[], mapRank?: number): Promise<UserDto> {
        let include: Prisma.UserInclude = ExpandToPrismaIncludes(expand);

        if (mapRank) {
            include ??= {};
            include.mapRanks = {
                where: { mapID: mapRank },
                include: { run: true }
            };
        }

        const dbResponse: any = await this.userRepo.get(id, include);

        if (!dbResponse) throw new NotFoundException('User not found');

        if (dbResponse.mapRanks) {
            dbResponse.mapRank = dbResponse.mapRanks[0];
            delete dbResponse.mapRanks;
        }

        return DtoFactory(UserDto, dbResponse);
    }

    async findOrCreateFromGame(steamID: bigint): Promise<AuthenticatedUser> {
        const summaryData = await this.steamService.getSteamUserSummaryData(steamID).catch((_) => {
            throw new ServiceUnavailableException('Failed to get player summary data from Steam');
        });

        if (steamID !== BigInt(summaryData.steamid))
            throw new BadRequestException('User fetched is not the authenticated user!');

        const profile = {
            steamID,
            alias: summaryData.personaname,
            avatar: summaryData.avatarhash,
            country: summaryData.loccountrycode
        };

        return this.findOrCreateUser(profile);
    }

    async findOrCreateFromWeb(profile: SteamUserSummaryData): Promise<AuthenticatedUser> {
        if (profile.profilestate !== 1)
            throw new ForbiddenException(
                'We do not authenticate Steam accounts without a profile. Set up your community profile on Steam!'
            );

        const user = await this.findOrCreateUser({
            steamID: BigInt(profile.steamid),
            alias: profile.personaname,
            avatar: profile.avatarhash,
            country: profile.loccountrycode
        });

        if (!user) throw new InternalServerErrorException('Could not get or create user');

        return user;
    }

    async findOrCreateUser(
        userData: Pick<User, 'steamID' | 'alias' | 'avatar' | 'country'>
    ): Promise<AuthenticatedUser> {
        const user = await this.userRepo.getBySteamID(userData.steamID);

        const input: Prisma.UserUpdateInput | Prisma.UserCreateInput = {
            alias: userData.alias,
            avatar: userData.avatar.replace('_full.jpg', ''),
            country: userData.country
        };

        if (user) {
            const { id, steamID } = await this.userRepo.update(user.id, input as Prisma.UserUpdateInput);
            return { id, steamID };
        } else {
            if (this.config.get('steam.preventLimited') && (await this.steamService.isAccountLimited(userData.steamID)))
                throw new ForbiddenException(
                    'We do not authenticate limited Steam accounts. Buy something on Steam first!'
                );

            input.steamID = userData.steamID;

            const { id, steamID } = await this.userRepo.create(input as Prisma.UserCreateInput);
            return { id, steamID };
        }
    }

    async update(userID: number, update: UpdateUserDto) {
        const user: any = await this.userRepo.get(userID, { profile: true, bans: true, roles: true });

        const updateInput: Prisma.UserUpdateInput = {};

        if (!update.alias && !update.bio) throw new BadRequestException('Request contains no valid update data');

        // Strict check - we want to handle if alias is empty string
        if (update.alias !== undefined) {
            if (user.bans?.alias === true) {
                throw new ForbiddenException('User is banned from updating their alias');
            } else {
                updateInput.alias = update.alias;
            }

            if (user.roles?.verified === true) {
                const verifiedMatches = await this.userRepo.count({
                    alias: update.alias,
                    roles: { is: { verified: true } }
                });

                if (verifiedMatches > 0) throw new ConflictException('Alias is in use by another verified user');
            }
        }

        if (update.bio) {
            if (user.bans?.bio === true) {
                throw new ForbiddenException('User is banned from updating their bio');
            } else {
                updateInput.profile = { update: { bio: update.bio } };
            }
        }

        await this.userRepo.update(userID, updateInput);
    }

    //#endregion

    //#region Auth

    getAuth(userID: number): Promise<UserAuth> {
        return this.userRepo.getAuth(userID);
    }

    //#endregion

    //#region Profile

    async getProfile(userID: number): Promise<ProfileDto> {
        const dbResponse = await this.userRepo.getProfile(userID);

        if (!dbResponse) throw new NotFoundException();

        return DtoFactory(ProfileDto, dbResponse);
    }

    async unlinkSocial(userID: number, type: string) {
        if (!['steam', 'discord', 'twitch'].includes(type)) throw new BadRequestException('Invalid social type');

        // TODO: Implement me!
    }

    //#endregion

    //#region Activities

    async getActivities(
        userID: number,
        skip?: number,
        take?: number,
        type?: ActivityTypes,
        data?: number
    ): Promise<PaginatedResponseDto<ActivityDto>> {
        const where: Prisma.ActivityWhereInput = {
            userID: userID,
            AND: [{ type: type }, { type: { not: ActivityTypes.REPORT_FILED } }],
            data: data
        };

        const dbResponse = await this.userRepo.getActivities(where, skip, take);

        return new PaginatedResponseDto(ActivityDto, dbResponse);
    }

    async getFollowedActivities(
        userID: number,
        skip?: number,
        take?: number,
        type?: ActivityTypes,
        data?: number
    ): Promise<PaginatedResponseDto<ActivityDto>> {
        const follows = await this.userRepo.getFollowing(userID);

        const following = follows[0].map((follow) => follow.followedID);

        const where: Prisma.ActivityWhereInput = {
            userID: {
                in: following
            },
            type: type,
            data: data
        };

        const dbResponse = await this.userRepo.getActivities(where, skip, take);

        return new PaginatedResponseDto(ActivityDto, dbResponse);
    }

    //#endregion

    //#region Follows

    async getFollowers(id: number, skip?: number, take?: number): Promise<PaginatedResponseDto<FollowDto>> {
        const dbResponse = await this.userRepo.getFollowers(id, skip, take);

        return new PaginatedResponseDto(FollowDto, dbResponse);
    }

    async getFollowing(id: number, skip?: number, take?: number): Promise<PaginatedResponseDto<FollowDto>> {
        const dbResponse = await this.userRepo.getFollowing(id, skip, take);

        return new PaginatedResponseDto(FollowDto, dbResponse);
    }

    async getFollowStatus(localUserID: number, targetUserID: number): Promise<FollowStatusDto> {
        const targetUser = await this.userRepo.get(targetUserID);

        if (!targetUser) throw new NotFoundException('Target user not found');

        const localToTarget = await this.userRepo.getFollower(localUserID, targetUserID);
        const targetToLocal = await this.userRepo.getFollower(targetUserID, localUserID);

        return DtoFactory(FollowStatusDto, {
            local: localToTarget,
            target: targetToLocal
        });
    }

    async followUser(localUserID: number, targetUserID: number) {
        const targetUser = await this.userRepo.get(targetUserID);
        if (!targetUser) throw new NotFoundException('Target user not found');

        const isFollowing = await this.userRepo.getFollower(localUserID, targetUserID);
        if (isFollowing) throw new BadRequestException('User is already following the target user');

        await this.userRepo.createFollow(localUserID, targetUserID);
    }

    async updateFollow(localUserID: number, targetUserID: number, updateDto: UpdateFollowStatusDto) {
        if (!updateDto) return;

        const targetUser = await this.userRepo.get(targetUserID);

        if (!targetUser) throw new NotFoundException('Target user not found');

        await this.userRepo.updateFollow(localUserID, targetUserID, { notifyOn: updateDto.notifyOn });
    }

    async unfollowUser(localUserID: number, targetUserID: number) {
        const targetUser = await this.userRepo.get(targetUserID);

        if (!targetUser) throw new NotFoundException('Target user not found');

        // Prisma errors on trying to delete an entry that does not exist
        // (https://github.com/prisma/prisma/issues/4072), where we want to just 404.
        await this.userRepo.deleteFollow(localUserID, targetUserID).catch(() => {
            throw new NotFoundException('Target follow does not exist');
        });
    }

    //#endregion

    //#region Notifications

    async getNotifications(
        userID: number,
        skip?: number,
        take?: number
    ): Promise<PaginatedResponseDto<NotificationDto>> {
        const dbResponse = await this.userRepo.getNotifications(userID, skip, take);

        return new PaginatedResponseDto(NotificationDto, dbResponse);
    }

    async updateNotification(userID: number, notificationID: number, updateDto: UpdateNotificationDto) {
        const notification = await this.userRepo.getNotification(notificationID);

        if (!notification) throw new NotFoundException('Notification does not exist');

        if (notification.userID !== userID) throw new ForbiddenException('Notification does not belong to user');

        await this.userRepo.updateNotification(notificationID, updateDto.read);
    }

    async deleteNotification(userID: number, notificationID: number) {
        const notification = await this.userRepo.getNotification(notificationID);

        if (!notification) throw new NotFoundException('Notification does not exist');

        if (notification.userID !== userID) throw new ForbiddenException('Notification does not belong to user');

        await this.userRepo.deleteNotification(notificationID);
    }

    //#endregion

    //#region Map Library

    async getMapLibraryEntry(
        userID: number,
        skip: number,
        take: number,
        _search: string,
        _expand: string[]
    ): Promise<PaginatedResponseDto<MapLibraryEntryDto>> {
        const dbResponse = await this.userRepo.getMapLibraryEntry(userID, skip, take);
        // TODO: Search and expansions

        return new PaginatedResponseDto(MapLibraryEntryDto, dbResponse);
    }

    async addMapLibraryEntry(userID: number, mapID: number) {
        const targetMap = await this.mapRepo.get(mapID);

        if (!targetMap) throw new NotFoundException('Target map not found');

        await this.userRepo.createMapLibraryEntry(userID, mapID);
    }

    async removeMapLibraryEntry(userID: number, mapID: number) {
        const targetMap = await this.mapRepo.get(mapID);

        if (!targetMap) throw new NotFoundException("Target map doesn't exist");

        await this.userRepo.deleteMapLibraryEntry(userID, mapID).catch(() => {
            throw new NotFoundException('Target map not in users library');
        });
    }

    //#endregion

    //#region Map Favorites

    async getFavoritedMaps(userID: number, skip: number, take: number, search: string, expand: string[]) {
        const where: Prisma.MapFavoriteWhereInput = { userID: userID };

        if (search) where.map = { name: { contains: search } };

        const include: Prisma.MapFavoriteInclude = {
            map: { include: ExpandToPrismaIncludes(expand) },
            user: true
        };

        const dbResponse = await this.userRepo.getFavoritedMaps(where, include, skip, take);

        return new PaginatedResponseDto(MapFavoriteDto, dbResponse);
    }

    async checkFavoritedMap(userID: number, mapID: number) {
        const where: Prisma.MapFavoriteWhereInput = {
            userID: userID,
            mapID: mapID
        };
        const dbResponse = await this.userRepo.getFavoritedMap(where);
        if (!dbResponse) throw new NotFoundException('Target map not found');

        return dbResponse;
    }

    async addFavoritedMap(userID: number, mapID: number) {
        const targetMap = await this.mapRepo.get(mapID);

        if (!targetMap) throw new NotFoundException('Target map not found');

        await this.userRepo.createFavouritedMapEntry(userID, mapID);
    }

    async removeFavoritedMap(userID: number, mapID: number) {
        const targetMap = await this.mapRepo.get(mapID);

        if (!targetMap) throw new NotFoundException("Target map doesn't exist");

        await this.userRepo.deleteFavouritedMapEntry(userID, mapID).catch(() => {
            throw new NotFoundException('Target map not in users library');
        });
    }

    //#endregion

    //#region Map Notify

    async getMapNotifyStatus(userID: number, mapID: number): Promise<MapNotifyDto> {
        const targetMap = await this.mapRepo.get(mapID);

        if (!targetMap) throw new NotFoundException('Target map not found');

        const dbResponse = await this.userRepo.getMapNotify(userID, mapID);

        if (!dbResponse) throw new NotFoundException('User has no notifications for this map');

        return DtoFactory(MapNotifyDto, dbResponse);
    }

    async updateMapNotify(userID: number, mapID: number, updateDto: UpdateMapNotifyDto) {
        if (!updateDto || !updateDto.notifyOn)
            throw new BadRequestException('Request does not contain valid notification type data');

        const targetMap = await this.mapRepo.get(mapID);

        if (!targetMap) throw new NotFoundException('Target map not found');

        await this.userRepo.upsertMapNotify(userID, mapID, updateDto.notifyOn);
    }

    async removeMapNotify(userID: number, mapID: number) {
        const targetMap = await this.mapRepo.get(mapID);

        if (!targetMap) throw new NotFoundException('Target map not found');

        await this.userRepo.deleteMapNotify(userID, mapID).catch(() => {
            throw new NotFoundException('Target map notification does not exist');
        });
    }

    //#endregion

    //#region Map Submissions

    async getSubmittedMaps(userID: number, skip?: number, take?: number, search?: string, expand?: string[]) {
        const where: Prisma.MapWhereInput = { submitterID: userID };

        if (search) where.name = { contains: search };

        const include: Prisma.MapInclude = ExpandToPrismaIncludes(expand);

        const submittedMapsRes = await this.mapRepo.getAll(where, include, undefined, skip, take);

        return new PaginatedResponseDto(MapDto, submittedMapsRes);
    }

    async getSubmittedMapsSummary(userID: number): Promise<MapSummaryDto[]> {
        const result = await this.mapRepo.getSubmittedMapsSummary(userID);

        if (!result) throw new NotFoundException('No submitted Maps found');

        return result.map(({ _count, statusFlag }) =>
            DtoFactory(MapSummaryDto, {
                statusFlag: statusFlag,
                statusCount: _count.statusFlag
            })
        );
    }

    //#endregion

    //#region Credits

    async getMapCredits(id: number, skip?: number, take?: number): Promise<PaginatedResponseDto<MapCreditDto>> {
        const dbResponse = await this.userRepo.getMapCredits(id, skip, take);

        return new PaginatedResponseDto(MapCreditDto, dbResponse);
    }

    //#endregion
}
