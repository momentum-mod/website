import {
  ActivityDto,
  ApiOkPagedResponse,
  FollowDto,
  MapCreditDto,
  PagedResponseDto,
  PagedQueryDto,
  ProfileDto,
  RunDto,
  UserDto,
  UsersGetActivitiesQueryDto,
  UsersGetAllQueryDto,
  UsersGetQueryDto
} from '@momentum/backend/dto';
import { ParseIntSafePipe } from '@momentum/backend/pipes';
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
import { RunsService } from '../runs/runs.service';
import { UsersService } from './users.service';

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
@ApiExtraModels(PagedResponseDto)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly runsService: RunsService
  ) {}

  //#region Main User Endpoints

  @Get()
  @ApiOperation({ summary: 'Returns paginated list of users' })
  @ApiOkPagedResponse(UserDto, { description: 'Paginated list of users' })
  @ApiBadRequestResponse({
    description: 'The query contained conflicting parameters'
  })
  getAll(
    @Query() query?: UsersGetAllQueryDto
  ): Promise<PagedResponseDto<UserDto>> {
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
  getUser(
    @Param('userID', ParseIntSafePipe) userID: number,
    @Query() query?: UsersGetQueryDto
  ): Promise<UserDto> {
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
  getProfile(
    @Param('userID', ParseIntSafePipe) userID: number
  ): Promise<ProfileDto> {
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
  @ApiOkPagedResponse(UserDto, {
    description: "Paginated list of the user's activites"
  })
  getActivities(
    @Param('userID', ParseIntSafePipe) userID: number,
    @Query() query?: UsersGetActivitiesQueryDto
  ): Promise<PagedResponseDto<ActivityDto>> {
    return this.usersService.getActivities(
      userID,
      query.skip,
      query.take,
      query.type,
      query.data
    );
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
  @ApiOkPagedResponse(UserDto, {
    description: 'Paginated list of the follows targeting the user'
  })
  getFollowers(
    @Param('userID', ParseIntSafePipe) userID: number,
    @Query() query?: PagedQueryDto
  ): Promise<PagedResponseDto<FollowDto>> {
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
  @ApiOkPagedResponse(UserDto, {
    description: 'Paginated list of the follows for the user'
  })
  getFollowed(
    @Param('userID', ParseIntSafePipe) userID: number,
    @Query() query: PagedQueryDto
  ): Promise<PagedResponseDto<FollowDto>> {
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
  @ApiOkPagedResponse(UserDto, {
    description: 'Paginated list of map credits attributed to the user'
  })
  getMapCredits(
    @Param('userID', ParseIntSafePipe) userID: number,
    @Query() query: PagedQueryDto
  ): Promise<PagedResponseDto<MapCreditDto>> {
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
  @ApiOkPagedResponse(UserDto, {
    description: "Paginated list of the user's runs"
  })
  getRuns(
    @Param('userID', ParseIntSafePipe) userID: number,
    @Query() query: PagedQueryDto
  ): Promise<PagedResponseDto<RunDto>> {
    return this.runsService.getAll({
      userID: userID,
      take: query.take,
      skip: query.skip
    });
  }

  //#endregion
}
