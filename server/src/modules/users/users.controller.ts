import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { UsersService } from './users.service';
import { UserDto } from '../../@common/dto/user/user.dto';
import { PagedResponseDto } from '../../@common/dto/common/api-response.dto';
import { ActivityDto } from '../../@common/dto/user/activity.dto';
import { ProfileDto } from '../../@common/dto/user/profile.dto';
import { UsersGetAllQuery } from './queries/get-all.query.dto';
import { UsersGetQuery } from './queries/get.query.dto';
import { UsersGetActivitiesQuery } from './queries/get-activities.query.dto';
import { UserMapCreditDto } from '../../@common/dto/map/mapCredit.dto';
import { FollowerDto } from '../../@common/dto/user/followers.dto';
import { PaginationQueryDto } from '../../@common/dto/common/pagination.dto';
import { RunDto } from '../../@common/dto/run/runs.dto';

@ApiBearerAuth()
@Controller('/api/v1/users')
@ApiTags('Users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @ApiOperation({ summary: 'Returns all users' })
    public async GetAll(@Query() query?: UsersGetAllQuery): Promise<PagedResponseDto<UserDto[]>> {
        return this.usersService.GetAll(
            query.skip,
            query.take,
            query.expand,
            query.search,
            query.playerID,
            query.playerIDs
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
    public async GetUser(
        @Param('userID', ParseIntPipe) userID: number,
        @Query() query?: UsersGetQuery
    ): Promise<UserDto> {
        return this.usersService.Get(userID, query.expand);
    }

    @Get(':userID/profile')
    @ApiOperation({ summary: "Returns single user's profile" })
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
    public async GetActivities(
        @Param('userID', ParseIntPipe) userID: number,
        @Query() query?: UsersGetActivitiesQuery
    ): Promise<PagedResponseDto<ActivityDto[]>> {
        return this.usersService.GetActivities(userID, query.skip, query.take, query.type, query.data);
    }

    @Get(':userID/followers')
    @ApiOperation({ summary: "Returns all of a single user's followers" })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    public async GetFollowers(
        @Param('userID', ParseIntPipe) userID: number,
        @Query() query?: PaginationQueryDto
    ): Promise<PagedResponseDto<FollowerDto[]>> {
        return this.usersService.GetFollowers(userID, query.skip, query.take);
    }

    @Get(':userID/follows')
    @ApiOperation({ summary: "Returns all of a single user's followed objects" })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    public async GetFollowed(
        @Param('userID') userID: number,
        @Query() query: PaginationQueryDto
    ): Promise<PagedResponseDto<FollowerDto[]>> {
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
    public async GetMapCredits(
        @Param('userID') userID: number,
        @Query() query: PaginationQueryDto
    ): Promise<PagedResponseDto<UserMapCreditDto[]>> {
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
    public async GetRuns(
        @Param('userID') userID: number,
        @Query() query: PaginationQueryDto
    ): Promise<PagedResponseDto<RunDto[]>> {
        return this.usersService.GetRuns(userID, query.skip, query.take);
    }
}
