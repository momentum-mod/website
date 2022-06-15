import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
    ApiParam,
    ApiExtraModels,
    ApiBadRequestResponse,
    ApiOkResponse,
    ApiNotFoundResponse
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { UsersService } from './users.service';
import { UserDto } from '../../@common/dto/user/user.dto';
import { ApiOkPaginatedResponse, PaginatedResponseDto } from '../../@common/dto/paginated-response.dto';
import { ActivityDto } from '../../@common/dto/user/activity.dto';
import { ProfileDto } from '../../@common/dto/user/profile.dto';
import { MapCreditDto } from '../../@common/dto/map/map-credit.dto';
import { FollowerDto } from '../../@common/dto/user/followers.dto';
import { PaginationQueryDto } from '../../@common/dto/query/pagination.dto';
import { RunDto } from '../../@common/dto/run/runs.dto';
import { UsersGetActivitiesQuery, UsersGetAllQuery, UsersGetQuery } from '../../@common/dto/query/user-queries.dto';

@ApiBearerAuth()
@Controller('/api/v1/users')
@ApiTags('Users')
@ApiExtraModels(PaginatedResponseDto)
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @ApiOperation({ summary: 'Returns all users' })
    @ApiOkPaginatedResponse(UserDto, { description: 'Paginated list of users' })
    @ApiBadRequestResponse({ description: 'The query contained conflicting parameters' })
    public async GetAll(@Query() query?: UsersGetAllQuery): Promise<PaginatedResponseDto<UserDto>> {
        return this.usersService.GetAll(
            query.skip,
            query.take,
            query.expand,
            query.search,
            query.playerID,
            query.playerIDs,
            query.mapRank
        );
    }

    @Get(':userID')
    @ApiOperation({ summary: 'Returns single user' })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiOkResponse({ type: UserDto, description: 'The found user' })
    @ApiNotFoundResponse({ description: 'User was not found' })
    public async GetUser(
        @Param('userID', ParseIntPipe) userID: number,
        @Query() query?: UsersGetQuery
    ): Promise<UserDto> {
        return this.usersService.Get(userID, query.expand, query.mapRank);
    }

    @Get(':userID/profile')
    @ApiOperation({ summary: "Returns single user's profile" })
    @ApiOkResponse({ type: ProfileDto, description: "The found user's profile" })
    @ApiNotFoundResponse({ description: 'Profile was not found' })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    public async GetProfile(@Param('userID', ParseIntPipe) userID: number): Promise<ProfileDto> {
        return this.usersService.GetProfile(userID);
    }

    @Get(':userID/activities')
    @ApiOperation({ summary: "Returns all of a single user's activities" })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiOkPaginatedResponse(UserDto, { description: "Paginated list of the user's activites" })
    public async GetActivities(
        @Param('userID', ParseIntPipe) userID: number,
        @Query() query?: UsersGetActivitiesQuery
    ): Promise<PaginatedResponseDto<ActivityDto>> {
        return this.usersService.GetActivities(userID, query.skip, query.take, query.type, query.data);
    }

    @Get(':userID/followers')
    @ApiOperation({ summary: 'Returns all follows targeting the user' })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiOkPaginatedResponse(UserDto, { description: 'Paginated list of the follows targeting the user' })
    public async GetFollowers(
        @Param('userID', ParseIntPipe) userID: number,
        @Query() query?: PaginationQueryDto
    ): Promise<PaginatedResponseDto<FollowerDto>> {
        return this.usersService.GetFollowers(userID, query.skip, query.take);
    }

    @Get(':userID/follows')
    @ApiOperation({ summary: 'Returns all the follows for the user' })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiOkPaginatedResponse(UserDto, { description: 'Paginated list of the follows for the user' })
    public async GetFollowed(
        @Param('userID') userID: number,
        @Query() query: PaginationQueryDto
    ): Promise<PaginatedResponseDto<FollowerDto>> {
        return this.usersService.GetFollowing(userID, query.skip, query.take);
    }

    @Get(':userID/credits')
    @ApiOperation({ summary: "Returns all of a single user's credits" })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiOkPaginatedResponse(UserDto, { description: 'Paginated list of map credits attributed to the user' })
    public async GetMapCredits(
        @Param('userID') userID: number,
        @Query() query: PaginationQueryDto
    ): Promise<PaginatedResponseDto<MapCreditDto>> {
        return this.usersService.GetMapCredits(userID, query.skip, query.take);
    }

    @Get(':userID/runs')
    @ApiOperation({ summary: "Returns all of a single user's runs" })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiOkPaginatedResponse(UserDto, { description: "Paginated list of the user's runs" })
    public async GetRuns(
        @Param('userID') userID: number,
        @Query() query: PaginationQueryDto
    ): Promise<PaginatedResponseDto<RunDto>> {
        // TODO: The old API calls the runs model here. We should do the same, this functionality
        // doesn't need to exist in the users service.
        return this.usersService.GetRuns(userID, query.skip, query.take);
    }
}
