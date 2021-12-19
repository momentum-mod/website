import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
	Activity, 
	Follow, 
	MapCredit, 
	Run
} from '@prisma/client';
import { UserDto, UserProfileDto } from "../dto/user.dto"
import { PagedResponseDto } from "../dto/api-response.dto";
import { UsersService } from "../services/users.service";

@Controller("api/v1/users")
@ApiTags("Users")
export class UsersController {

	constructor(private readonly usersService: UsersService) {}

	@Get()
	@ApiOperation({ summary: "Returns all users" })	
	@ApiQuery({
		name: "skip",
		type: Number,
		description: "Offset this many records",
		required: false
	})
	@ApiQuery({
		name: "take",
		type: Number,
		description: "Take this many records",
		required: false
	})
	public async GetAllUsers(@Query('skip') skip?: number, @Query('take') take?: number): Promise<PagedResponseDto<UserDto[]>> {
		return this.usersService.GetAll(skip, take);
	}

	@Get(":userID")	
	@ApiOperation({ summary: "Returns single user" })
	@ApiQuery({
		name: "userID",
		type: Number,
		description: "Target User ID",
		required: true
	})
	public async GetUser(@Param('userID') userID: number): Promise<UserDto> {
		return this.usersService.Get(userID);
	}

	@Get(":userID/profile")
	@ApiOperation({ summary: "Returns single user's profile" })
	@ApiQuery({
		name: "userID",
		type: Number,
		description: "Target User ID",
		required: true
	})
	public async GetUserProfile(@Param('userID') userID: number): Promise<UserProfileDto> {
		return this.usersService.GetProfile(userID);
	}

	@Get(":userID/activities")	
	@ApiOperation({ summary: "Returns all of a single user's activities" })
	@ApiQuery({
		name: "userID",
		type: Number,
		description: "Target User ID",
		required: true
	})
	@ApiQuery({
		name: "skip",
		type: Number,
		description: "Offset this many records",
		required: false
	})
	@ApiQuery({
		name: "take",
		type: Number,
		description: "Take this many records",
		required: false
	})
	public async GetActivities(@Param('userID') userID: number, @Query('skip') skip?: number, @Query('take') take?: number): Promise<PagedResponseDto<Activity[]>> {
		return this.usersService.GetActivities(userID, skip, take);
	}

	@Get(":userID/followers")
	@ApiOperation({ summary: "Returns all of a single user's followers" })
	@ApiQuery({
		name: "userID",
		type: Number,
		description: "Target User ID",
		required: true
	})
	@ApiQuery({
		name: "skip",
		type: Number,
		description: "Offset this many records",
		required: false
	})
	@ApiQuery({
		name: "take",
		type: Number,
		description: "Take this many records",
		required: false
	})
	public async GetFollowers(@Param('userID') userID: number, @Query('skip') skip?: number, @Query('take') take?: number): Promise<PagedResponseDto<Follow[]>> {
		return this.usersService.GetFollowers(userID, skip, take);
	}

	@Get(":userID/follows")
	@ApiOperation({ summary: "Returns all of a single user's followed objects" })
	@ApiQuery({
		name: "userID",
		type: Number,
		description: "Target User ID",
		required: true
	})
	@ApiQuery({
		name: "skip",
		type: Number,
		description: "Offset this many records",
		required: false
	})
	@ApiQuery({
		name: "take",
		type: Number,
		description: "Take this many records",
		required: false
	})
	public async GetFollowed(@Param('userID') userID: number, @Query('skip') skip?: number, @Query('take') take?: number): Promise<PagedResponseDto<Follow[]>> {
		return this.usersService.GetFollowed(userID, skip, take);
	}

	@Get(":userID/credits")
	@ApiOperation({ summary: "Returns all of a single user's credits" })
	@ApiQuery({
		name: "userID",
		type: Number,
		description: "Target User ID",
		required: true
	})
	@ApiQuery({
		name: "skip",
		type: Number,
		description: "Offset this many records",
		required: false
	})
	@ApiQuery({
		name: "take",
		type: Number,
		description: "Take this many records",
		required: false
	})
	public async GetCredits(@Param('userID') userID: number, @Query('skip') skip?: number, @Query('take') take?: number): Promise<PagedResponseDto<MapCredit[]>> {
		return this.usersService.GetCredits(userID, skip, take);
	}

	@Get(":userID/runs")
	@ApiOperation({ summary: "Returns all of a single user's runs" })
	@ApiQuery({
		name: "userID",
		type: Number,
		description: "Target User ID",
		required: true
	})
	@ApiQuery({
		name: "skip",
		type: Number,
		description: "Offset this many records",
		required: false
	})
	@ApiQuery({
		name: "take",
		type: Number,
		description: "Take this many records",
		required: false
	})
	public async GetRuns(@Param('userID') userID: number, @Query('skip') skip?: number, @Query('take') take?: number): Promise<PagedResponseDto<Run[]>> {
		return this.usersService.GetRuns(userID, skip, take);
	}
}
