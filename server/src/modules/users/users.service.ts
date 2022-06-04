import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { UserMapRank, Prisma, User, UserAuth } from '@prisma/client';
import { UpdateUserDto, UserDto } from '../../@common/dto/user/user.dto';
import { ProfileDto, ProfileUpdateDto } from '../../@common/dto/user/profile.dto';
import { PagedResponseDto } from '../../@common/dto/common/api-response.dto';
import { UsersRepo } from './users.repo';
import { appConfig } from '../../../config/config';
import { lastValueFrom, map } from 'rxjs';
import * as xml2js from 'xml2js';
import { HttpService } from '@nestjs/axios';
import { ActivityDto } from '../../@common/dto/user/activity.dto';
import { FollowerDto } from '../../@common/dto/user/followers.dto';
import { MapRankDto } from '../../@common/dto/map/mapRank.dto';
import { MapCreditDto } from '../../@common/dto/map/mapCredit.dto';
import { EBan } from '../../@common/enums/user.enum';
import { EActivityTypes } from '../../@common/enums/activity.enum';
import { RunDto } from '../../@common/dto/run/runs.dto';
import { DtoUtils } from '../../@common/utils/dto-utils';

@Injectable()
export class UsersService {
    constructor(private readonly userRepo: UsersRepo, private readonly http: HttpService) {}

    //#region GETs

    // TODO: mapRank
    public async GetAll(
        skip?: number,
        take?: number,
        expand?: string[],
        search?: string,
        playerID?: string,
        playerIDs?: string[]
    ): Promise<PagedResponseDto<UserDto[]>> {
        const where: Prisma.UserWhereInput = {};

        if (playerID && playerIDs) throw new BadRequestException();

        if (playerID) {
            take = 1;
            where.steamID = playerID;
        } else if (playerIDs) {
            where.steamID = { in: playerIDs };
        }

        if (search) where.alias = { startsWith: search };

        const include: Prisma.UserInclude = {
            profile: expand?.includes('profile'),
            userStats: expand?.includes('userStats')
        };

        const dbResponse = await this.userRepo.GetAll(where, include, skip, take);

        return DtoUtils.MapPaginatedResponse(UserDto, dbResponse);
    }

    public async Get(id: number, expand?: string[], mapRank?: number): Promise<UserDto> {
        const include: Prisma.UserInclude = {
            profile: expand?.includes('profile'),
            userStats: expand?.includes('userStats')
        };

        if (mapRank) {
            include.mapRanks = {
                where: {
                    mapID: mapRank
                },
                include: {
                    run: true
                }
            };
        }

        const dbResponse: any = await this.userRepo.Get(id, include);

        if (!dbResponse) throw new NotFoundException();

        return DtoUtils.Factory(UserDto, dbResponse);
    }

    public async GetProfile(userID: number): Promise<ProfileDto> {
        const dbResponse = await this.userRepo.GetProfile(userID);

        if (!dbResponse) throw new NotFoundException();

        return DtoUtils.Factory(ProfileDto, dbResponse);
    }

    public async GetActivities(
        userID: number,
        skip?: number,
        take?: number,
        type?: EActivityTypes,
        data?: bigint
    ): Promise<PagedResponseDto<ActivityDto[]>> {
        const where: Prisma.ActivityWhereInput = {
            userID: userID,
            type: type,
            data: data
        };

        const dbResponse = await this.userRepo.GetActivities(where, skip, take);

        // Do we want to be so open here? Shouldn't report activity be hidden?

        return DtoUtils.MapPaginatedResponse(ActivityDto, dbResponse);
    }

    public async GetFollowers(id: number, skip?: number, take?: number): Promise<PagedResponseDto<FollowerDto[]>> {
        const dbResponse = await this.userRepo.GetFollowers(id, skip, take);

        return DtoUtils.MapPaginatedResponse(FollowerDto, dbResponse);
    }

    public async GetFollowing(id: number, skip?: number, take?: number): Promise<PagedResponseDto<FollowerDto[]>> {
        const dbResponse = await this.userRepo.GetFollowing(id, skip, take);

        return DtoUtils.MapPaginatedResponse(FollowerDto, dbResponse);
    }

    public async GetMapCredits(id: number, skip?: number, take?: number): Promise<PagedResponseDto<MapCreditDto[]>> {
        const dbResponse = await this.userRepo.GetMapCredits(id, skip, take);

        return DtoUtils.MapPaginatedResponse(MapCreditDto, dbResponse);
    }

    public async GetRuns(id: number, skip?: number, take?: number): Promise<PagedResponseDto<RunDto[]>> {
        const dbResponse = await this.userRepo.GetRuns(id, skip, take);

        return DtoUtils.MapPaginatedResponse(RunDto, dbResponse);
    }

    async GetAuth(userID: number): Promise<UserAuth> {
        const whereInput: Prisma.UserAuthWhereUniqueInput = {};
        whereInput.id = userID;
        return await this.userRepo.GetAuth(whereInput);
    }

    //#endregion

    //#region Find or create

    async FindOrCreateFromGame(steamID: string): Promise<User> {
        const profile = await this.ExtractUserProfileFromSteamID(steamID);
        return this.FindOrCreateUserFromProfile(profile);
    }

    // TODO: openIDProfile Type
    async FindOrCreateFromWeb(openID: any): Promise<User> {
        // Grab Steam ID from community url
        const identifierRegex = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/;
        const steamID = identifierRegex.exec(openID)[1];

        const profile = await this.ExtractPartialUserProfileFromSteamID(steamID);

        return this.FindOrCreateUserFromProfile(profile);
    }

    public async FindOrCreateUserFromProfile(profile: UserDto): Promise<User> {
        const user = await this.userRepo.GetBySteamID(profile.steamID);

        if (user) {
            const updateInput: Prisma.UserUpdateInput = {};
            updateInput.alias = profile.alias;
            updateInput.avatar = profile.avatar;
            updateInput.country = profile.country;

            return this.userRepo.Update(user.id, updateInput);
        } else {
            const createInput: Prisma.UserCreateInput = {};
            createInput.steamID = profile.steamID;
            createInput.alias = profile.alias;
            createInput.avatar = profile.avatarURL;
            createInput.country = profile.country;

            return this.userRepo.Insert(createInput);
        }
    }

    //#endregion

    //#region Update
    async Update(userID: number, userUpdate: UpdateUserDto) {
        const userWithProfile = await this.userRepo.Get(userID, { profile: true });

        // Strict check - we want to handle if alias is empty string
        if (typeof userUpdate.alias !== 'undefined') {
            //await this.UpdateUserAlias(new UserDto(userProfile), userUpdate.alias);
        }

        if (userUpdate.profile) {
            //await this.UpdateProfile(userProfile, userUpdate.profile);
        }
    }

    async UpdateUserAlias(user: User, alias: string): Promise<User> {
        const updateInput: Prisma.UserUpdateInput = {};

        if (user.bans & EBan.BANNED_ALIAS) {
            const steamUserData = await this.GetSteamUserSummaryData(user.steamID);

            if (steamUserData) {
                updateInput.alias = steamUserData.personaname;
            }
        } else {
            updateInput.alias = alias;
        }

        return await this.userRepo.Update(user.id, updateInput);
    }

    async UpdateProfile(userProfile: UserDto, profileUpdate: ProfileUpdateDto): Promise<ProfileDto> {
        if (!profileUpdate.bio || userProfile.bans & EBan.BANNED_BIO) return;

        const updateInput: Prisma.ProfileUpdateInput = {};

        updateInput.bio = profileUpdate.bio;
        return await this.userRepo.UpdateProfile(userProfile.profile.id, updateInput);
    }

    async UpdateRefreshToken(userID: number, refreshToken: string): Promise<UserAuth> {
        const updateInput: Prisma.UserAuthUpdateInput = {};
        updateInput.refreshToken = refreshToken;
        const whereInput: Prisma.UserAuthWhereUniqueInput = {};
        whereInput.id = userID;
        return await this.userRepo.UpdateAuth(whereInput, updateInput);
    }

    //#endregion

    //#region Delete
    async Delete(userID: number) {
        await this.userRepo.Delete(userID);
        return;
        // TODO: Logout. best to do without including auth service, so we need a logout POST I guess?
    }

    //#endregion

    //#region Private
    private async ExtractUserProfileFromSteamID(steamID: string): Promise<UserDto> {
        const summaryData = await this.GetSteamUserSummaryData(steamID);

        if (steamID !== summaryData.steamid)
            return Promise.reject(new HttpException('User fetched is not the authenticated user!', 400));

        const profileData = await this.GetSteamUserProfileData(steamID);

        if (appConfig.steam.preventLimited && profileData.profile.isLimitedAccount[0] === '1') {
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
        profile.roles = 0;
        profile.bans = 0;
        profile.country = summaryData.locccountrycode;
        profile.createdAt = null;
        profile.updatedAt = null;
        console.log('wowee!!');
        console.log(profile);

        return profile;
    }

    private async ExtractPartialUserProfileFromSteamID(steamID: string): Promise<UserDto> {
        // TODO: ?????? what is this. why
        // await this.GetSteamProfileFromSteamID(steamID);

        const profile = new UserDto();
        profile.steamID = steamID;

        return profile;
    }

    private async GetSteamUserSummaryData(steamID: string): Promise<SteamUserSummaryData> {
        const getPlayerResponse = await lastValueFrom(
            this.http
                .get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`, {
                    params: {
                        key: appConfig.steam.webAPIKey,
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
            return Promise.reject(new HttpException('Failed to get any player summaries.', 500));
        }

        if (!getPlayerResponse.response.players[0]) {
            return Promise.reject(new HttpException('Failed to get player summary.', 500));
        }

        return getPlayerResponse.response.players[0];
    }

    private async GetSteamUserProfileData(steamID: string): Promise<SteamUserProfileData> {
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

// Private Classes
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
