import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { Prisma, User, UserAuth } from '@prisma/client';
import { UpdateUserDto, UserDto } from '../../common/dto/user/user.dto';
import { ProfileDto } from '../../common/dto/user/profile.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { UsersRepoService } from '../repo/users-repo.service';
import { lastValueFrom, map } from 'rxjs';
import * as xml2js from 'xml2js';
import { HttpService } from '@nestjs/axios';
import { ActivityDto } from '../../common/dto/user/activity.dto';
import { FollowDto, FollowStatusDto, UpdateFollowStatusDto } from '../../common/dto/user/followers.dto';
import { MapCreditDto } from '../../common/dto/map/map-credit.dto';
import { ActivityTypes } from '../../common/enums/activity.enum';
import { RunDto } from '../../common/dto/run/runs.dto';
import { DtoFactory, ExpandToPrismaIncludes } from '../../common/utils/dto.utility';
import { MapNotifyDto, UpdateMapNotifyDto } from '../../common/dto/map/map-notify.dto';
import { MapsRepoService } from '../repo/maps-repo.service';
import { NotificationDto, UpdateNotificationDto } from '../../common/dto/user/notification.dto';
import { MapLibraryEntryDto } from '../../common/dto/map/map-library-entry';
import { MapFavoriteDto } from '../../common/dto/map/map-favorite.dto';
import { ConfigService } from '@nestjs/config';
import { UsersGetAllQuery, UsersGetQuery } from '../../common/dto/query/user-queries.dto';

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

        dbResponse[0].forEach((user: any) => {
            if (user.mapRanks) {
                user.mapRank = user.mapRanks[0];
                delete user.mapRanks;
            }
        });

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
        return this.findOrCreateUserFromProfile(profile);
    }

    // TODO: openIDProfile Type
    async findOrCreateFromWeb(openID: any): Promise<User> {
        // Grab Steam ID from community url
        const identifierRegex = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/;
        const steamID = identifierRegex.exec(openID)[1];

        const profile = await this.extractPartialUserProfileFromSteamID(steamID);

        return this.findOrCreateUserFromProfile(profile);
    }

    async findOrCreateUserFromProfile(profile: UserDto): Promise<User> {
        const user = await this.userRepo.getBySteamID(profile.steamID);

        if (user) {
            const updateInput: Prisma.UserUpdateInput = {};
            updateInput.alias = profile.alias;
            updateInput.avatar = profile.avatar;
            updateInput.country = profile.country;

            return this.userRepo.update(user.id, updateInput);
        } else {
            const createInput: Prisma.UserCreateInput = {
                steamID: profile.steamID,
                alias: profile.alias,
                avatar: profile.avatarURL, // ???
                country: profile.country
            };

            return this.userRepo.create(createInput);
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
        const whereInput: Prisma.UserAuthWhereUniqueInput = {};
        whereInput.id = userID;
        return await this.userRepo.getAuth(whereInput);
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
        search: string,
        expand: string[]
    ): Promise<PaginatedResponseDto<MapLibraryEntryDto>> {
        const dbResponse = await this.userRepo.getMapLibraryEntry(userID, skip, take);
        // TODO: Search and expansions

        return new PaginatedResponseDto(MapLibraryEntryDto, dbResponse);
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

    //#endregion

    //#region Map Notify

    async getMapNotifyStatus(userID: number, mapID: number): Promise<MapNotifyDto> {
        const targetMap = await this.mapRepo.get(mapID);

        if (!targetMap) throw new NotFoundException('Target map not found');

        const dbResponse = await this.userRepo.getMapNotify(userID, mapID);

        return DtoFactory(MapNotifyDto, dbResponse, true);
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

    private async extractUserProfileFromSteamID(steamID: string): Promise<UserDto> {
        const summaryData = await this.getSteamUserSummaryData(steamID);

        if (steamID !== summaryData.steamid)
            return Promise.reject(new HttpException('User fetched is not the authenticated user!', 400));

        const profileData = await this.getSteamUserProfileData(steamID);

        if (this.config.get('steam.preventLimited') && profileData.profile.isLimitedAccount[0] === '1') {
            return Promise.reject(
                new HttpException('We do not authenticate limited Steam accounts. Buy something on Steam first!', 403)
            );
        }
        const profile = new UserDto();

        console.log('creating new user', summaryData);

        profile.id = 0;
        profile.steamID = steamID;
        profile.alias = summaryData.personaname;
        profile.aliasLocked = false;
        profile.avatar = summaryData.avatarfull;
        profile.country = summaryData.locccountrycode;
        profile.createdAt = null;
        profile.updatedAt = null;
        console.log('wowee!!');
        console.log(profile);

        return profile;
    }

    private async extractPartialUserProfileFromSteamID(steamID: string): Promise<UserDto> {
        // TODO: ?????? what is this. why
        // await this.GetSteamProfileFromSteamID(steamID);

        const profile = new UserDto();
        profile.steamID = steamID;
        // TODO: Remove when reworking this method!
        profile.alias ??= 'temp';

        return profile;
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
                .pipe(
                    map((res) => {
                        return res.data;
                    })
                )
        );

        if (getPlayerResponse.response.error) {
            return Promise.reject(new HttpException('Failed to get any player summaries', 500));
        }

        if (!getPlayerResponse.response.players[0]) {
            return Promise.reject(new HttpException('Failed to get player summary', 500));
        }

        return getPlayerResponse.response.players[0];
    }

    private async getSteamUserProfileData(steamID: string): Promise<SteamUserProfileData> {
        return await lastValueFrom(
            this.http.get(`https://steamcommunity.com/profiles/${steamID}?xml=1`).pipe(
                map(async (res) => {
                    return await xml2js.parseStringPromise(res.data);
                })
            )
        );
    }

    //#endregion
}

//#region Private Classes

class SteamUserSummaryData {
    profilestate: any;
    steamid: string;
    personaname: string;
    avatarfull: string;
    locccountrycode: string;
}

class SteamUserProfileData {
    profile: {
        isLimitedAccount: string[];
    };
}

//#endregion
