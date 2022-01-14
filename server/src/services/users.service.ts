import { HttpException, Injectable } from '@nestjs/common';  
import {
	Follow as FollowDB, 
	MapCredit as MapCreditDB, 
	User,
	UserAuth,
	Prisma,
	Profile,
	MapRank
} from '@prisma/client';
import { UserDto, UserProfileDto } from "../dto/user/user.dto"
import { ProfileDto } from "../dto/user/profile.dto"
import { PagedResponseDto } from "../dto/common/api-response.dto";
import { UserRepo as UserRepo } from "../repositories/users.repo";
import { appConfig } from 'config/config';
import { lastValueFrom, map } from 'rxjs';
import * as xml2js from 'xml2js';
import { HttpService } from '@nestjs/axios';
import { ActivityDto } from '../dto/user/activity.dto';
import { FollowerDto } from '../dto/user/followers.dto';
import { MapRankDto } from '../dto/map/mapRank.dto';
import { UserRunDto } from '../dto/run/runs.dto';

@Injectable()
export class UsersService {
	constructor(
		private readonly userRepo: UserRepo,
		private readonly http: HttpService,
	){}

	//#region GETs
  	public async GetAll(skip?: number, take?: number): Promise<PagedResponseDto<UserDto[]>> {
		const dbResponse = await this.userRepo.GetAll(undefined, skip, take);

		const totalCount = dbResponse[1];
		const users = dbResponse[0];

		const userDtos = users.map((user: User) => {
			const userDto = new UserDto(user);

			return userDto;
		});

		return { 
			totalCount: totalCount,
			returnCount: userDtos.length,
			response: userDtos
		}
	}

	public async Get(id: number): Promise<UserDto> {
		const dbResponse = await this.userRepo.Get(id);
		const userDto = new UserDto(dbResponse);

		return userDto;
	}

	public async GetBySteamID(id: string): Promise<UserDto> {
		const dbResponse = await this.userRepo.GetBySteamID(id);
		const userDto = new UserDto(dbResponse);
		
		return userDto;
	}

	public async GetProfile(id: number): Promise<UserProfileDto> {
		
		const userProfileDb = await this.userRepo.GetUserProfile(id);
		const userDto = new UserDto(userProfileDb[0]);

		// Create DTO from db objects
		const userProfileDto = new UserProfileDto(
			userDto, 
			userProfileDb[1]
		);

		return userProfileDto;
	}

	public async GetActivities(id: number, skip?: number, take?: number): Promise<PagedResponseDto<ActivityDto[]>> {
		const activitesAndCount = await this.userRepo.GetActivities(id, skip, take);
	
		const activitesDto = []

		activitesAndCount[0].forEach((c) => {
			const user: User = (c as any).users;
			const profile: Profile = (c as any).users.profiles
	
			// Create DTO from db objects
			const userProfileDto = new UserProfileDto(
				user, 
				new ProfileDto(profile)
			);

			activitesDto.push(new ActivityDto(c, userProfileDto));
		})

		const response: PagedResponseDto<ActivityDto[]> = {
			response: activitesDto,
			returnCount: activitesDto.length,
			totalCount: activitesAndCount[1]
		};

		return response;
	}

	public async GetFollowers(id: number, skip?: number, take?: number): Promise<PagedResponseDto<FollowerDto[]>> {
		const followersAndCount = await this.userRepo.GetFollowers(id, skip, take);

		const followersDto = []

		followersAndCount[0].forEach((c) => {
			const followeeUser: User = (c as any).users_follows_followeeIDTousers;
			const followeeProfile: Profile = (c as any).users_follows_followeeIDTousers.profiles

			// Create DTO from db objects
			const followee = new UserProfileDto(
				followeeUser,
				new ProfileDto(followeeProfile)
			);

			const followedUser: User = (c as any).users_follows_followedIDTousers;
			const followedProfile: Profile = (c as any).users_follows_followedIDTousers.profiles

			// Create DTO from db objects
			const followed = new UserProfileDto(
				followedUser,
				new ProfileDto(followedProfile)
			);


			followersDto.push(new FollowerDto(c, followed, followee));
		})

		const response: PagedResponseDto<FollowerDto[]> = {
			response: followersDto,
			returnCount: followersDto.length,
			totalCount: followersAndCount[1]
		};

		return response;
	}

	public async GetFollowing(id: number, skip?: number, take?: number): Promise<PagedResponseDto<FollowDB[]>> {
		const followersAndCount = await this.userRepo.GetFollowing(id, skip, take);

		const followersDto = []

		followersAndCount[0].forEach((c) => {
			const followeeUser: User = (c as any).users_follows_followeeIDTousers;
			const followeeProfile: Profile = (c as any).users_follows_followeeIDTousers.profiles

			// Create DTO from db objects
			const followee = new UserProfileDto(
				followeeUser,
				new ProfileDto(followeeProfile)
			);

			const followedUser: User = (c as any).users_follows_followedIDTousers;
			const followedProfile: Profile = (c as any).users_follows_followedIDTousers.profiles

			// Create DTO from db objects
			const followed = new UserProfileDto(
				followedUser,
				new ProfileDto(followedProfile)
			);


			followersDto.push(new FollowerDto(c, followed, followee));
		})

		const response: PagedResponseDto<FollowerDto[]> = {
			response: followersDto,
			returnCount: followersDto.length,
			totalCount: followersAndCount[1]
		};

		return response;
	}

	public GetCredits(id: number, skip?: number, take?: number): PagedResponseDto<MapCreditDB[]> {
		const response: MapCreditDB[] = [];
		let totalCount = 0;

		// temp
		totalCount = 100;

		return { 
			totalCount: totalCount,
			returnCount: response.length,
			response: response
		}
	}

	public async GetRuns(id: number, skip?: number, take?: number): Promise<PagedResponseDto<UserRunDto[]>> {
		const runsAndCount = await this.userRepo.GetRuns(id, skip, take);
		const runsDto: UserRunDto[] = [];

		runsAndCount[0].forEach((c) => {
			const runUser: User = (c as any).users;
			const runMapRank: MapRank = (c as any).mapRank;

			// Create DTO from db objects
			const runUserDto = new UserDto(runUser);	
			const runMapRankDto = new MapRankDto(runMapRank);			

			const runDto = new UserRunDto(c, runUserDto, runMapRankDto)

			runsDto.push(runDto);
		})

		
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
			this.http.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`, {
				params: {
					key: appConfig.steam.webAPIKey,
					steamids: steamID,
				}
			}).pipe(
				map((res) => {
					return res.data;
				})
			)
		)

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
		const partialProfile = await this.GetSteamProfileFromSteamID(steamID);

		const profile = new UserDto(null);
		profile.steamID = steamID;
		
		return profile;	
	}

	private async GetSteamProfileFromSteamID(steamID: string): Promise<SteamUserData["xmlData"]>{
		let result: SteamUserData["xmlData"] = {
			profile: {
				isLimitedAccount:[]
			}
		}
		const getSteamProfileResponse = await lastValueFrom(
			this.http.get(`https://steamcommunity.com/profiles/${steamID}?xml=1`).pipe(
				map(async (res) => {
					return await xml2js.parseStringPromise(res.data);
				})
			)
		)
		result = getSteamProfileResponse

		if (appConfig.steam.preventLimited && result.profile.isLimitedAccount[0] === '1')
			return Promise.reject(new HttpException('We do not authenticate limited Steam accounts. Buy something on Steam first!', 403));

		return result;
	}


	private async FindOrCreateUserFromProfile(profile: UserDto): Promise<User> {
		const user = await this.userRepo.GetBySteamID(profile.steamID)

		if(user){
			const updateInput: Prisma.UserUpdateInput = {};
			updateInput.alias = profile.alias;
			updateInput.avatar = profile.avatar;
			updateInput.country = profile.country;
			updateInput.updatedAt = new Date();

			const whereInput: Prisma.UserAuthWhereUniqueInput = {};
			whereInput.id = user.id;

			return this.userRepo.Update(whereInput, updateInput)
		} else {
			const createInput: Prisma.UserCreateInput = {
				createdAt: new Date(),
				updatedAt: new Date(),
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
		profilestate: any,
		steamid: string,
		personaname: string,
		avatarfull: string,
		locccountrycode: string
	};
	xmlData: {
		profile: {
			isLimitedAccount: string[]
		}
	}
}
