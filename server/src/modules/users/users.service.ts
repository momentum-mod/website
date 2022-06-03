import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { Follow, Map as MapDB, MapRank, Prisma, User, UserAuth } from '@prisma/client';
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
import { UserMapCreditDto } from '../../@common/dto/map/mapCredit.dto';
import { EBan } from '../../@common/enums/user.enum';
import { EActivityTypes } from '../../@common/enums/activity.enum';
import { RunDto } from '../../@common/dto/run/runs.dto';

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

        const userDtos = dbResponse[0].map((user) => new UserDto(user, (user as any).profile));

        return {
            totalCount: dbResponse[1],
            returnCount: userDtos.length,
            response: userDtos
        };
    }

    public async Get(id: number, expand?: string[]): Promise<UserDto> {
        const include: Prisma.UserInclude = {
            profile: expand?.includes('profile'),
            userStats: expand?.includes('userStats')
        };

        const dbResponse = await this.userRepo.Get(id, include);

        if (!dbResponse) throw new NotFoundException();

        return new UserDto(dbResponse, (dbResponse as any).profile);
    }

    public async GetProfile(id: number): Promise<UserProfileDto> {
        const userProfileDb = await this.userRepo.GetUserProfile(id);
        const userDto = new UserDto(userProfileDb[0]);

        // Create DTO from db objects
        const userProfileDto = new UserProfileDto(userDto, userProfileDb[1]);

        return userProfileDto;
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

        const activitesDto = dbResponse[0].map(
            (activity: any) => new ActivityDto(activity, new UserDto(activity.user))
        );

        return {
            response: activitesDto,
            returnCount: activitesDto.length,
            totalCount: dbResponse[1]
        };
    }

    public async GetFollowers(id: number, skip?: number, take?: number): Promise<PagedResponseDto<FollowerDto[]>> {
        const dbResponse = await this.userRepo.GetFollowers(id, skip, take);

        return this.MakeFollowersDto(dbResponse);
    }

    public async GetFollowing(id: number, skip?: number, take?: number): Promise<PagedResponseDto<FollowerDto[]>> {
        const dbResponse = await this.userRepo.GetFollowing(id, skip, take);

        return this.MakeFollowersDto(dbResponse);
    }

    private MakeFollowersDto(followersAndCount: [Follow[], number]): PagedResponseDto<FollowerDto[]> {
        const followersDto = followersAndCount[0].map((follow) => {
            const followeeUser: any = (follow as any).followeeUser;
            const followee = new UserDto(followeeUser, new ProfileDto(followeeUser.profile));

            const followedUser: any = (follow as any).followedUser;
            const followed = new UserDto(followedUser, new ProfileDto(followedUser.profile));

            return new FollowerDto(follow, followee, followed);
        });

        return {
            response: followersDto,
            returnCount: followersDto.length,
            totalCount: followersAndCount[1]
        };
    }

    public async GetMapCredits(
        id: number,
        skip?: number,
        take?: number
    ): Promise<PagedResponseDto<UserMapCreditDto[]>> {
        const mapCreditsAndCount = await this.userRepo.GetMapCredits(id, skip, take);
        const mapCreditsDto: UserMapCreditDto[] = [];

        mapCreditsAndCount[0].forEach((c) => {
            const user: User = (c as any).users;
            const map: MapDB = (c as any).maps;

            const mapCreditDto = new UserMapCreditDto(c, user, map);

            mapCreditsDto.push(mapCreditDto);
        });

        return {
            response: mapCreditsDto,
            returnCount: mapCreditsDto.length,
            totalCount: mapCreditsAndCount[1]
        };
    }

    public async GetRuns(id: number, skip?: number, take?: number): Promise<PagedResponseDto<RunDto[]>> {
        const runsAndCount = await this.userRepo.GetRuns(id, skip, take);
        const runsDto: RunDto[] = [];

        runsAndCount[0].forEach((c) => {
            const runUser: User = (c as any).users;
            const runMapRank: MapRank = (c as any).mapRank;

            // Create DTO from db objects
            const runUserDto = new UserDto(runUser);
            const runMapRankDto = new MapRankDto(runMapRank);

            const runDto = new UserRunDto(c, runUserDto, runMapRankDto);

            runsDto.push(runDto);
        });

        const response: PagedResponseDto<UserRunDto[]> = {
            response: runsDto,
            returnCount: runsDto.length,
            totalCount: runsAndCount[1]
        };

        return response;
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
    //#endregion

    //#region Update
    async UpdateUser(userID: number, updateInput: Prisma.UserUpdateInput): Promise<User> {
        const whereInput: Prisma.UserAuthWhereUniqueInput = {};
        whereInput.id = userID;
        return await this.userRepo.Update(whereInput, updateInput);
    }

    async UpdateRefreshToken(userID: number, refreshToken: string): Promise<UserAuth> {
        const updateInput: Prisma.UserAuthUpdateInput = {};
        updateInput.refreshToken = refreshToken;
        const whereInput: Prisma.UserAuthWhereUniqueInput = {};
        whereInput.id = userID;
        return await this.userRepo.UpdateAuth(whereInput, updateInput);
    }

    //#endregion

    //#region Private
    private async ExtractUserProfileFromSteamID(steamID: string): Promise<UserDto> {
        const data: SteamUserData = {
            summaries: {
                profilestate: {},
                steamid: '',
                personaname: '',
                avatarfull: '',
                locccountrycode: ''
            },
            xmlData: {
                profile: {
                    isLimitedAccount: []
                }
            }
        };

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

        data.summaries = getPlayerResponse.response.players[0];

        data.xmlData = await this.GetSteamProfileFromSteamID(steamID);

        if (steamID !== data.summaries.steamid)
            return Promise.reject(new HttpException('User fetched is not the authenticated user!', 400));

        const profile = new UserDto(null);
        profile.id = 0;
        profile.steamID = steamID;
        profile.alias = data.summaries.personaname;
        profile.aliasLocked = false;
        profile.avatarURL = data.summaries.avatarfull;
        profile.roles = 0;
        profile.bans = 0;
        profile.country = data.summaries.locccountrycode;
        profile.createdAt = null;
        profile.updatedAt = null;

        return profile;
    }

    private async ExtractPartialUserProfileFromSteamID(steamID: string): Promise<UserDto> {
        await this.GetSteamProfileFromSteamID(steamID);

        const profile = new UserDto(null);
        profile.steamID = steamID;

        return profile;
    }

    private async GetSteamProfileFromSteamID(steamID: string): Promise<SteamUserData['xmlData']> {
        let result: SteamUserData['xmlData'] = {
            profile: {
                isLimitedAccount: []
            }
        };
        const getSteamProfileResponse = await lastValueFrom(
            this.http.get(`https://steamcommunity.com/profiles/${steamID}?xml=1`).pipe(
                map(async (res) => {
                    return await xml2js.parseStringPromise(res.data);
                })
            )
        );
        result = getSteamProfileResponse;

        if (appConfig.steam.preventLimited && result.profile.isLimitedAccount[0] === '1')
            return Promise.reject(
                new HttpException('We do not authenticate limited Steam accounts. Buy something on Steam first!', 403)
            );

        return result;
    }

    private async FindOrCreateUserFromProfile(profile: UserDto): Promise<User> {
        const user = await this.userRepo.GetBySteamID(profile.steamID);

        if (user) {
            const updateInput: Prisma.UserUpdateInput = {};
            updateInput.alias = profile.alias;
            updateInput.avatar = profile.avatar;
            updateInput.country = profile.country;
            updateInput.updatedAt = new Date();

            const whereInput: Prisma.UserAuthWhereUniqueInput = {};
            whereInput.id = user.id;

            return this.userRepo.Update(whereInput, updateInput);
        } else {
            const createInput: Prisma.UserCreateInput = {
                createdAt: new Date(),
                updatedAt: new Date()
            };
            createInput.steamID = profile.steamID;
            createInput.alias = profile.alias;
            createInput.avatar = profile.avatarURL;
            createInput.country = profile.country;

            return this.userRepo.Insert(createInput);
        }
    }

    //#endregion
}

// Private Classes
class SteamUserData {
    summaries: {
        profilestate: any;
        steamid: string;
        personaname: string;
        avatarfull: string;
        locccountrycode: string;
    };
    xmlData: {
        profile: {
            isLimitedAccount: string[];
        };
    };
}
