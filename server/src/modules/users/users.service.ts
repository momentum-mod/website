import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException
} from '@nestjs/common';
import { Prisma, User, UserAuth } from '@prisma/client';
import { UpdateUserDto, UserDto } from '@common/dto/user/user.dto';
import { ProfileDto } from '@common/dto/user/profile.dto';
import { PaginatedResponseDto } from '@common/dto/paginated-response.dto';
import { UsersRepoService } from '../repo/users-repo.service';
import { lastValueFrom, map } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ActivityDto } from '@common/dto/user/activity.dto';
import { FollowDto, FollowStatusDto, UpdateFollowStatusDto } from '@common/dto/user/followers.dto';
import { MapCreditDto } from '@common/dto/map/map-credit.dto';
import { ActivityTypes } from '@common/enums/activity.enum';
import { RunDto } from '@common/dto/run/runs.dto';
import { DtoFactory, ExpandToPrismaIncludes } from '@lib/dto.lib';
import { MapNotifyDto, UpdateMapNotifyDto } from '@common/dto/map/map-notify.dto';
import { MapsRepoService } from '../repo/maps-repo.service';
import { NotificationDto, UpdateNotificationDto } from '@common/dto/user/notification.dto';
import { MapLibraryEntryDto } from '@common/dto/map/map-library-entry';
import { MapFavoriteDto } from '@common/dto/map/map-favorite.dto';
import { ConfigService } from '@nestjs/config';
import { UsersGetAllQuery } from '@common/dto/query/user-queries.dto';
import { SteamUserSummaryData } from '@modules/auth/auth.interfaces';
import { MapDto } from '@common/dto/map/map.dto';

@Injectable()
export class UsersService {
    constructor(
        private readonly userRepo: UsersRepoService,
        private readonly mapRepo: MapsRepoService,
        private readonly http: HttpService,
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

            include.mapRanks = {
                where: {
                    mapID: query.mapRank
                },
                include: {
                    run: true
                }
            };
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
                where: {
                    mapID: mapRank
                },
                include: {
                    run: true
                }
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

    async findOrCreateFromGame(steamID: string): Promise<User> {
        const profile = await this.extractUserProfileFromSteamID(steamID);

        return this.findOrCreateUser(profile);
    }

    async findOrCreateFromWeb(profile: SteamUserSummaryData): Promise<User> {
        return this.findOrCreateUser({
            steamID: profile.steamid,
            alias: profile.personaname,
            avatar: profile.avatarhash,
            country: profile.loccountrycode
        });
    }

    async findOrCreateUser(userData: UserCreateData): Promise<User> {
        const user = await this.userRepo.getBySteamID(userData.steamID);

        const input: Prisma.UserUpdateInput | Prisma.UserCreateInput = {
            alias: userData.alias,
            avatar: userData.avatar,
            country: userData.country
        };

        if (user) {
            return this.userRepo.update(user.id, input as Prisma.UserUpdateInput);
        } else {
            if (this.config.get('steam.preventLimited') && (await this.isAccountLimited(userData.steamID)))
                throw new UnauthorizedException(
                    'We do not authenticate limited Steam accounts. Buy something on Steam first!'
                );

            input.steamID = userData.steamID;

            return this.userRepo.create(input as Prisma.UserCreateInput);
        }
    }

    async update(userID: number, update: UpdateUserDto) {
        const user: any = await this.userRepo.get(userID, { profile: true, bans: true, roles: true });

        const updateInput: Prisma.UserUpdateInput = {};

        if (!update.alias && !update.bio) throw new BadRequestException('Request contains no valid update data');

        // Strict check - we want to handle if alias is empty string
        if (typeof update.alias !== 'undefined') {
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

    async getAuth(userID: number): Promise<UserAuth> {
        return await this.userRepo.getAuth(userID);
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
        data?: bigint
    ): Promise<PaginatedResponseDto<ActivityDto>> {
        const where: Prisma.ActivityWhereInput = {
            userID: userID,
            type: type,
            data: data
        };

        const dbResponse = await this.userRepo.getActivities(where, skip, take);

        // Do we want to be so open here? Shouldn't report activity be hidden?

        return new PaginatedResponseDto(ActivityDto, dbResponse);
    }

    async getFollowedActivities(
        userID: number,
        skip?: number,
        take?: number,
        type?: ActivityTypes,
        data?: bigint
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

        if (search) where.map = { name: { startsWith: search } };

        const include: Prisma.MapFavoriteInclude = {
            map: { include: ExpandToPrismaIncludes(expand) },
            user: true
        };

        const dbResponse = await this.userRepo.getFavoritedMaps(where, include, skip, take);

        return new PaginatedResponseDto(MapFavoriteDto, dbResponse);
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
    //#region Credits

    async getMapCredits(id: number, skip?: number, take?: number): Promise<PaginatedResponseDto<MapCreditDto>> {
        const dbResponse = await this.userRepo.getMapCredits(id, skip, take);

        return new PaginatedResponseDto(MapCreditDto, dbResponse);
    }

    //#endregion

    //#region Runs

    async getRuns(id: number, skip?: number, take?: number): Promise<PaginatedResponseDto<RunDto>> {
        const dbResponse = await this.userRepo.getRuns(id, skip, take);

        return new PaginatedResponseDto(RunDto, dbResponse);
    }

    //#endregion

    //#region Private

    private async extractUserProfileFromSteamID(steamID: string): Promise<UserCreateData> {
        const summaryData = await this.getSteamUserSummaryData(steamID);

        if (steamID !== summaryData.steamid)
            throw new BadRequestException('User fetched is not the authenticated user!');

        return {
            steamID: steamID,
            alias: summaryData.personaname,
            avatar: summaryData.avatarhash,
            country: summaryData.loccountrycode
        };
    }

    private async getSteamUserSummaryData(steamID: string): Promise<SteamUserSummaryData> {
        const getPlayerResponse = await lastValueFrom(
            this.http
                .get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`, {
                    params: {
                        key: this.config.get('steam.webAPIKey'),
                        steamids: steamID
                    }
                })
                .pipe(map((res) => res.data))
        );

        const userSummary = getPlayerResponse.response?.players?.[0];

        if (getPlayerResponse.response.error || !userSummary)
            throw new InternalServerErrorException('Failed to get player summary');

        return userSummary;
    }

    /**
     * Checks whether a Steam account is in "limited" mode i.e. hasn't spent $5 or more on Steam. Unfortunately Steam
     * Web API doesn't return this, so we have to use this messier method of parsing the profile page as XML.
     * @private
     */
    private async isAccountLimited(steamID: string): Promise<boolean> {
        return await lastValueFrom(
            this.http
                .get(`https://steamcommunity.com/profiles/${steamID}?xml=1`)
                .pipe(map((res) => /(?<=<isLimitedAccount>)\d(?=<\/isLimitedAccount>)/.exec(res.data)[0] === '1'))
        );
    }

    //#endregion
}

//#region Private Types

type UserCreateData = Pick<User, 'steamID' | 'alias' | 'avatar' | 'country'>;

//#endregion
