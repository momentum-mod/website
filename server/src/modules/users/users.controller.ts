import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, ApiParam } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { UsersService } from './users.service';
import { UserDto } from '../../@common/dto/user/user.dto';
import { UserProfileDto } from '../../@common/dto/user/profile.dto';
import { PagedResponseDto } from '../../@common/dto/common/api-response.dto';
import { ActivityDto } from '../../@common/dto/user/activity.dto';
import { UserRunDto } from '../../@common/dto/run/runs.dto';
import { UserMapCreditDto } from '../../@common/dto/map/mapCredit.dto';
import { FollowerDto } from '../../@common/dto/user/followers.dto';

@ApiBearerAuth()
@Controller('api/v1/users')
@ApiTags('Users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Public()
    @Get()
    @ApiOperation({ summary: 'Returns all users' })
    @ApiQuery({
        name: 'skip',
        type: Number,
        description: 'Offset this many records',
        required: false
    })
    @ApiQuery({
        name: 'take',
        type: Number,
        description: 'Take this many records',
        required: false
    })
    public async GetAllUsers(
        @Query('skip') skip?: number,
        @Query('take') take?: number
    ): Promise<PagedResponseDto<UserDto[]>> {
        return this.usersService.GetAll(skip, take);
    }

    @Get(':userID')
    @ApiOperation({ summary: 'Returns single user' })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    public async GetUser(@Param('userID') userID: number): Promise<UserDto> {
        return this.usersService.Get(userID);
    }

    @Get(':userID/profile')
    @ApiOperation({ summary: "Returns single user's profile" })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    public async GetUserProfile(@Param('userID') userID: number): Promise<UserProfileDto> {
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
    @ApiQuery({
        name: 'skip',
        type: Number,
        description: 'Offset this many records',
        required: false
    })
    @ApiQuery({
        name: 'take',
        type: Number,
        description: 'Take this many records',
        required: false
    })
    public async GetActivities(
        @Param('userID') userID: number,
        @Query('skip') skip?: number,
        @Query('take') take?: number
    ): Promise<PagedResponseDto<ActivityDto[]>> {
        return this.usersService.GetActivities(userID, skip, take);
    }

    @Get(':userID/followers')
    @ApiOperation({ summary: "Returns all of a single user's followers" })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiQuery({
        name: 'skip',
        type: Number,
        description: 'Offset this many records',
        required: false
    })
    @ApiQuery({
        name: 'take',
        type: Number,
        description: 'Take this many records',
        required: false
    })
    public async GetFollowers(
        @Param('userID') userID: number,
        @Query('skip') skip?: number,
        @Query('take') take?: number
    ): Promise<PagedResponseDto<FollowerDto[]>> {
        return this.usersService.GetFollowers(userID, skip, take);
    }

    @Get(':userID/follows')
    @ApiOperation({ summary: "Returns all of a single user's followed objects" })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiQuery({
        name: 'skip',
        type: Number,
        description: 'Offset this many records',
        required: false
    })
    @ApiQuery({
        name: 'take',
        type: Number,
        description: 'Take this many records',
        required: false
    })
    public async GetFollowed(
        @Param('userID') userID: number,
        @Query('skip') skip?: number,
        @Query('take') take?: number
    ): Promise<PagedResponseDto<FollowerDto[]>> {
        return this.usersService.GetFollowing(userID, skip, take);
    }

    @Get(':userID/credits')
    @ApiOperation({ summary: "Returns all of a single user's credits" })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiQuery({
        name: 'skip',
        type: Number,
        description: 'Offset this many records',
        required: false
    })
    @ApiQuery({
        name: 'take',
        type: Number,
        description: 'Take this many records',
        required: false
    })
    public async GetMapCredits(
        @Param('userID') userID: number,
        @Query('skip') skip?: number,
        @Query('take') take?: number
    ): Promise<PagedResponseDto<UserMapCreditDto[]>> {
        return this.usersService.GetMapCredits(userID, skip, take);
    }

    @Get(':userID/runs')
    @ApiOperation({ summary: "Returns all of a single user's runs" })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiQuery({
        name: 'skip',
        type: Number,
        description: 'Offset this many records',
        required: false
    })
    @ApiQuery({
        name: 'take',
        type: Number,
        description: 'Take this many records',
        required: false
    })
    public async GetRuns(
        @Param('userID') userID: number,
        @Query('skip') skip?: number,
        @Query('take') take?: number
    ): Promise<PagedResponseDto<UserRunDto[]>> {
        return this.usersService.GetRuns(userID, skip, take);
    }
}
