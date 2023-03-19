import { Controller, Get, Param, Query } from '@nestjs/common';
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
import { UsersService } from './users.service';
import { UserDto } from '@common/dto/user/user.dto';
import { ApiOkPaginatedResponse, PaginatedResponseDto } from '@common/dto/paginated-response.dto';
import { ActivityDto } from '@common/dto/user/activity.dto';
import { ProfileDto } from '@common/dto/user/profile.dto';
import { MapCreditDto } from '@common/dto/map/map-credit.dto';
import { FollowDto } from '@common/dto/user/follow.dto';
import { PaginationQuery } from '@common/dto/query/pagination.dto';
import { RunDto } from '@common/dto/run/run.dto';
import { UsersGetActivitiesQuery, UsersGetAllQuery, UsersGetQuery } from '@common/dto/query/user-queries.dto';
import { ParseIntSafePipe } from '@common/pipes/parse-int-safe.pipe';
import { RunsService } from '@modules/runs/runs.service';

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
@ApiExtraModels(PaginatedResponseDto)
export class UsersController {
    constructor(private readonly usersService: UsersService, private readonly runsService: RunsService) {}

    //#region Main User Endpoints

    @Get()
    @ApiOperation({ summary: 'Returns paginated list of users' })
    @ApiOkPaginatedResponse(UserDto, { description: 'Paginated list of users' })
    @ApiBadRequestResponse({ description: 'The query contained conflicting parameters' })
    getAll(@Query() query?: UsersGetAllQuery): Promise<PaginatedResponseDto<UserDto>> {
        return this.usersService.getAll(query);
    }

    @Get('/:userID')
    @ApiOperation({ summary: 'Returns single user' })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiOkResponse({ type: UserDto, description: 'The found user' })
    @ApiNotFoundResponse({ description: 'User was not found' })
    getUser(@Param('userID', ParseIntSafePipe) userID: number, @Query() query?: UsersGetQuery): Promise<UserDto> {
        return this.usersService.get(userID, query.expand, query.mapRank);
    }

    //#endregion

    //#region Profile

    @Get('/:userID/profile')
    @ApiOperation({ summary: "Returns single user's profile" })
    @ApiOkResponse({ type: ProfileDto, description: "The found user's profile" })
    @ApiNotFoundResponse({ description: 'Profile was not found' })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    getProfile(@Param('userID', ParseIntSafePipe) userID: number): Promise<ProfileDto> {
        return this.usersService.getProfile(userID);
    }

    //#endregion

    //#region Activities

    @Get('/:userID/activities')
    @ApiOperation({ summary: "Returns all of a single user's activities" })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiOkPaginatedResponse(UserDto, { description: "Paginated list of the user's activites" })
    getActivities(
        @Param('userID', ParseIntSafePipe) userID: number,
        @Query() query?: UsersGetActivitiesQuery
    ): Promise<PaginatedResponseDto<ActivityDto>> {
        return this.usersService.getActivities(userID, query.skip, query.take, query.type, query.data);
    }

    //#endregion

    //#region Follows

    @Get('/:userID/followers')
    @ApiOperation({ summary: 'Returns all follows targeting the user' })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiOkPaginatedResponse(UserDto, { description: 'Paginated list of the follows targeting the user' })
    getFollowers(
        @Param('userID', ParseIntSafePipe) userID: number,
        @Query() query?: PaginationQuery
    ): Promise<PaginatedResponseDto<FollowDto>> {
        return this.usersService.getFollowers(userID, query.skip, query.take);
    }

    @Get('/:userID/follows')
    @ApiOperation({ summary: 'Returns all the follows for the user' })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiOkPaginatedResponse(UserDto, { description: 'Paginated list of the follows for the user' })
    getFollowed(
        @Param('userID', ParseIntSafePipe) userID: number,
        @Query() query: PaginationQuery
    ): Promise<PaginatedResponseDto<FollowDto>> {
        return this.usersService.getFollowing(userID, query.skip, query.take);
    }

    //#endregion

    //#region Credits

    @Get('/:userID/credits')
    @ApiOperation({ summary: "Returns all of a single user's credits" })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiOkPaginatedResponse(UserDto, { description: 'Paginated list of map credits attributed to the user' })
    getMapCredits(
        @Param('userID', ParseIntSafePipe) userID: number,
        @Query() query: PaginationQuery
    ): Promise<PaginatedResponseDto<MapCreditDto>> {
        return this.usersService.getMapCredits(userID, query.skip, query.take);
    }

    //#endregion

    //#region Runs

    @Get('/:userID/runs')
    @ApiOperation({ summary: "Returns all of a single user's runs" })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiOkPaginatedResponse(UserDto, { description: "Paginated list of the user's runs" })
    getRuns(
        @Param('userID', ParseIntSafePipe) userID: number,
        @Query() query: PaginationQuery
    ): Promise<PaginatedResponseDto<RunDto>> {
        return this.runsService.getAll({ userID: userID, take: query.take, skip: query.skip });
    }

    //#endregion
}
