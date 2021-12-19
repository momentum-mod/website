import { HttpException, Injectable } from '@nestjs/common';  
import {
	Activity as ActivityDB, 
	Follow as FollowDB, 
	MapCredit as MapCreditDB, 
	Prisma, 
	Run as RunDB,
	User,
	UserAuth,
} from '@prisma/client';
import { UserDto, UserProfileDto } from "../dto/user.dto"
import { PagedResponseDto } from "../dto/api-response.dto";
import { UserRepo as UserRepo } from "../repositories/users.repo";
import { appConfig } from 'config/config';
import { lastValueFrom, map } from 'rxjs';
import * as xml2js from 'xml2js';
import { HttpService } from '@nestjs/axios';
import { OpenIDDto } from '../dto/open-ID.dto';

@Injectable()
export class UsersService {
	constructor(
		private readonly userRepo: UserRepo,
		private readonly http: HttpService,
	){}

	//#region GETs
  	public GetAll(skip?: number, take?: number): PagedResponseDto<UserDto[]> {
		  
		const response: UserDto[] = [
			{
				id: 1,
				steamID: "steam:123",
				alias: "jane",
				aliasLocked: true,
				avatar: "jane.jpg",
				avatarURL: "jane.jpg",
				bans: 0,
				roles: 1,
				country: "UK",
				createdAt: new Date,
				updatedAt: new Date
			},
			{
				id: 2,
				steamID: "steam:1234",
				alias: "john",
				aliasLocked: true,
				avatar: "john.jpg",
				avatarURL: "john.jpg",
				bans: 1,
				roles: 0,
				country: "US",
				createdAt: new Date,
				updatedAt: new Date
			}
		]

		return { 
			totalCount: 100,
			returnCount: response.length,
			response: response
		}
	}

	public Get(id: number): UserDto {
		return {
			id: 1,
			steamID: "steam:123",
			alias: "jane",
			aliasLocked: true,
			avatar: "jane.jpg",
			avatarURL: "jane.jpg",
			bans: 0,
			roles: 1,
			country: "UK",			
			createdAt: new Date,
			updatedAt: new Date
		};
	}

	public GetBySteamID(id: string): UserDto {
		return {
			id: 1,
			steamID: "steam:123",
			alias: "jane",
			aliasLocked: true,
			avatar: "jane.jpg",
			avatarURL: "jane.jpg",
			bans: 0,
			roles: 1,
			country: "UK",			
			createdAt: new Date,
			updatedAt: new Date
		};
	}

	public GetProfile(id: number): UserProfileDto {
		return {
			id: 1,
			userID: 1,
			steamID: "steam:123",
			bio: "combat surf best fight me",
			alias: "jane",
			aliasLocked: true,
			avatar: "jane.jpg",
			avatarURL: "jane.jpg",
			bans: 0,
			roles: 1,
			country: "UK",	
			featuredBadgeID: 1,
			createdAt: new Date,
			updatedAt: new Date
		};
	}

	public GetActivities(id: number, skip?: number, take?: number): PagedResponseDto<ActivityDB[]> {
		const response: ActivityDB[] = [];
		let totalCount = 0;

		// temp
		totalCount = 100;

		return { 
			totalCount: totalCount,
			returnCount: response.length,
			response: response
		}
	}

	public GetFollowers(id: number, skip?: number, take?: number): PagedResponseDto<FollowDB[]> {
		const response: FollowDB[] = [];
		let totalCount = 0;

		// temp
		totalCount = 100;

		return { 
			totalCount: totalCount,
			returnCount: response.length,
			response: response
		}
	}

	public GetFollowed(id: number, skip?: number, take?: number): PagedResponseDto<FollowDB[]> {
		const response: FollowDB[] = [];
		let totalCount = 0;

		// temp
		totalCount = 100;

		return { 
			totalCount: totalCount,
			returnCount: response.length,
			response: response
		}
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

	public GetRuns(id: number, skip?: number, take?: number): PagedResponseDto<RunDB[]> {
		const response: RunDB[] = [];
		let totalCount = 0;

		// temp
		totalCount = 100;

		return { 
			totalCount: totalCount,
			returnCount: response.length,
			response: response
		}
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
	async FindOrCreateFromWeb(openID: OpenIDDto): Promise<User> {
		// Grab Steam ID from community url		
		const identifierRegex = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/;
		const steamID = identifierRegex.exec(openID.claimed_id)[1];

		const profile = await this.ExtractUserProfileFromSteamID(steamID);

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
		const data = {
			summaries: {
				profilestate: {},
				steamid: '',
				personaname: '',
				avatarfull: '',
				locccountrycode: ''
			},
			xmlData: {
				profile: {
					isLimitedAccount:[]
				}
			},
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
		
		const getSteamProfileResponse = await lastValueFrom(
			this.http.get(`https://steamcommunity.com/profiles/${steamID}?xml=1`).pipe(
				map(async (res) => {
					return await xml2js.parseStringPromise(res.data);
				})
			)
		)

        data.xmlData = getSteamProfileResponse;

		if (data.summaries.profilestate !== 1)
			return Promise.reject(new HttpException('We do not authenticate Steam accounts without a profile. Set up your community profile on Steam!', 403));
		if (appConfig.steam.preventLimited && data.xmlData.profile.isLimitedAccount[0] === '1')
			return Promise.reject(new HttpException('We do not authenticate limited Steam accounts. Buy something on Steam first!', 403));
		if (steamID !== data.summaries.steamid)
			return Promise.reject(new HttpException('User fetched is not the authenticated user!', 400));

		const profile: UserDto = {
			alias:  data.summaries.personaname,
			avatarURL: data.summaries.avatarfull,
			country: data.summaries.locccountrycode,
			id: 0,
			steamID: steamID,
			aliasLocked: false,
			avatar: '',
			roles: 0,
			bans: 0,
			createdAt: undefined,
			updatedAt: undefined,
		};
		return profile;		
	}


	private async FindOrCreateUserFromProfile(profile: UserDto): Promise<User> {
		const whereInput: Prisma.UserWhereUniqueInput = {};
		whereInput.steamID = profile.steamID;

		const user = await this.userRepo.Get(whereInput)

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
