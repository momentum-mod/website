import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { Prisma, User, UserAuth } from '@prisma/client';
import { UpdateUserDto, UserDto } from '../../@common/dto/user/user.dto';
import { ProfileDto } from '../../@common/dto/user/profile.dto';
import { PagedResponseDto } from '../../@common/dto/common/api-response.dto';
import { UsersRepo } from './users.repo';
import { appConfig } from '../../../config/config';
import { lastValueFrom, map } from 'rxjs';
import * as xml2js from 'xml2js';
import { HttpService } from '@nestjs/axios';
import { ActivityDto } from '../../@common/dto/user/activity.dto';
import { FollowerDto, FollowStatusDto } from '../../@common/dto/user/followers.dto';
import { MapCreditDto } from '../../@common/dto/map/mapCredit.dto';
import { EBan, ERole } from '../../@common/enums/user.enum';
import { EActivityTypes } from '../../@common/enums/activity.enum';
import { RunDto } from '../../@common/dto/run/runs.dto';
import { DtoUtils } from '../../@common/utils/dto-utils';

@Injectable()
export class UsersService {
    constructor(private readonly userRepo: UsersRepo, private readonly http: HttpService) {}

    //#region Main User Functions

    public async GetAll(
        skip?: number,
        take?: number,
        expand?: string[],
        search?: string,
        playerID?: string,
        playerIDs?: string[],
        mapRank?: number
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
            profile: !!expand?.includes('profile'),
            userStats: !!expand?.includes('userStats')
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

        const dbResponse = await this.userRepo.GetAll(where, include, skip, take);

        dbResponse[0].forEach((user: any) => {
            if (user.mapRanks) {
                user.mapRank = user.mapRanks[0];
                delete user.mapRanks;
            }
        });

        return DtoUtils.MapPaginatedResponse(UserDto, dbResponse);
    }

    public async Get(id: number, expand?: string[], mapRank?: number): Promise<UserDto> {
        const include: Prisma.UserInclude = {
            profile: !!expand?.includes('profile'),
            userStats: !!expand?.includes('userStats')
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

        if (dbResponse.mapRanks) {
            dbResponse.mapRank = dbResponse.mapRanks[0];
            delete dbResponse.mapRanks;
        }

        return DtoUtils.Factory(UserDto, dbResponse);
    }

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

    async Update(userID: number, update: UpdateUserDto) {
        const user: any = await this.userRepo.Get(userID, { profile: true });

        const updateInput: Prisma.UserUpdateInput = {};

        if (!update.alias && !update.bio) return;

        // Strict check - we want to handle if alias is empty string
        if (typeof update.alias !== 'undefined') {
            if (user.bans & EBan.BANNED_ALIAS) {
                throw new ForbiddenException('User is banned from updating their alias.');
            } else {
                updateInput.alias = update.alias;
            }

            // TODO: Do corresponding logic in the admin service to check if a user's alias is in use by another verified user when verifying them.
            if (user.roles & ERole.VERIFIED) {
                const verifiedMatches = await this.userRepo.Count({
                    alias: update.alias,
                    roles: ERole.VERIFIED
                });

                if (verifiedMatches > 0) throw new ConflictException('Alias is in use by another verified user.');
            }
        }

        if (update.bio) {
            if (user.bans & EBan.BANNED_BIO) {
                throw new ForbiddenException('User is banned from updating their bio.');
            } else {
                updateInput.profile = {
                    update: { bio: update.bio }
                };
            }
        }

        await this.userRepo.Update(userID, updateInput);
    }

    async Delete(userID: number) {
        await this.userRepo.Delete(userID);
        return;
        // TODO: Logout. best to do without including auth service, so we need a logout POST I guess?
    }

    //#endregion

    //#region Auth

    async GetAuth(userID: number): Promise<UserAuth> {
        const whereInput: Prisma.UserAuthWhereUniqueInput = {};
        whereInput.id = userID;
        return await this.userRepo.GetAuth(whereInput);
    }

    async UpdateRefreshToken(userID: number, refreshToken: string): Promise<UserAuth> {
        const updateInput: Prisma.UserAuthUpdateInput = {};
        updateInput.refreshToken = refreshToken;
        const whereInput: Prisma.UserAuthWhereUniqueInput = {};
        whereInput.id = userID;
        return await this.userRepo.UpdateAuth(whereInput, updateInput);
    }

    //#endregion

    //#region Profile

    public async GetProfile(userID: number): Promise<ProfileDto> {
        const dbResponse = await this.userRepo.GetProfile(userID);

        if (!dbResponse) throw new NotFoundException();

        return DtoUtils.Factory(ProfileDto, dbResponse);
    }

    //#endregion

    //#region Activities

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

    //#endregion

    //#region Follows

    public async GetFollowers(id: number, skip?: number, take?: number): Promise<PagedResponseDto<FollowerDto[]>> {
        const dbResponse = await this.userRepo.GetFollowers(id, skip, take);

        return DtoUtils.MapPaginatedResponse(FollowerDto, dbResponse);
    }

    public async GetFollowing(id: number, skip?: number, take?: number): Promise<PagedResponseDto<FollowerDto[]>> {
        const dbResponse = await this.userRepo.GetFollowing(id, skip, take);

        return DtoUtils.MapPaginatedResponse(FollowerDto, dbResponse);
    }

    public async GetFollowStatus(localUserID: number, targetUserID: number): Promise<FollowStatusDto> {
        const localToTarget = await this.userRepo.GetFollower(localUserID, targetUserID);

        const targetToLocal = await this.userRepo.GetFollower(targetUserID, localUserID);

        return DtoUtils.Factory(FollowStatusDto, {
            local: localToTarget,
            target: targetToLocal
        });
    }

    public async FollowUser(localUserID: number, targetUserID: number) {
        const targetUser = await this.userRepo.Get(targetUserID);

        if (!targetUser) throw new NotFoundException('Target user not found.');

        await this.userRepo.CreateFollow(localUserID, targetUserID);
    }

    //#endregion

    //#region Credits

    public async GetMapCredits(id: number, skip?: number, take?: number): Promise<PagedResponseDto<MapCreditDto[]>> {
        const dbResponse = await this.userRepo.GetMapCredits(id, skip, take);

        return DtoUtils.MapPaginatedResponse(MapCreditDto, dbResponse);
    }

    //#endregion

    //#region Runs

    public async GetRuns(id: number, skip?: number, take?: number): Promise<PagedResponseDto<RunDto[]>> {
        const dbResponse = await this.userRepo.GetRuns(id, skip, take);

        return DtoUtils.MapPaginatedResponse(RunDto, dbResponse);
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
