import {
  Controller,
  Get,
  Param,
  Query,
  SerializeOptions
} from '@nestjs/common';
import { UserResponseSchema } from '@momentum/constants';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiExtraModels,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiQuery
} from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import {
  ActivityDto,
  ApiOkPagedResponse,
  FollowDto,
  MapCreditDto,
  PagedResponseDto,
  PagedQueryDto,
  ProfileDto,
  UserDto,
  UsersGetActivitiesQueryDto,
  UsersGetAllQueryDto,
  UsersGetCreditsQueryDto
} from '../../dto';
import { ParseInt32SafePipe } from '../../pipes';
import { UsersService } from './users.service';
import { BypassJwtAuth, LoggedInUser } from '../../decorators';
import {
  UserQuery,
  UserQuerySchema,
  UserSerializerSchema
} from '../../dto/user/user.schema';

@Controller('users')
@BypassJwtAuth()
@ApiTags('Users')
@ApiBearerAuth()
@ApiExtraModels(PagedResponseDto)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
  @ApiOkResponse({
    schema: UserResponseSchema.toJsonSchema() as SchemaObject,
    description: 'The found user'
  })
  @SerializeOptions({ schema: UserSerializerSchema })
  @ApiNotFoundResponse({ description: 'User was not found' })
  @ApiQuery({
    name: 'expand',
    type: String,
    enum: ['profile', 'userStats'],
    required: false,
    description: 'Comma-separated relations to include'
  })
  getUser(
    @Param('userID', ParseInt32SafePipe) userID: number,
    @Query({ schema: UserQuerySchema }) query: UserQuery
  ): Promise<unknown> {
    return this.usersService.getRaw(userID, query.expand);
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
    @Param('userID', ParseInt32SafePipe) userID: number
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
    @Param('userID', ParseInt32SafePipe) userID: number,
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
    @Param('userID', ParseInt32SafePipe) userID: number,
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
    @Param('userID', ParseInt32SafePipe) userID: number,
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
    @Param('userID', ParseInt32SafePipe) userID: number,
    @Query() query: UsersGetCreditsQueryDto,
    @LoggedInUser('id') localUserID?: number
  ): Promise<PagedResponseDto<MapCreditDto>> {
    return this.usersService.getMapCredits(
      userID,
      query.expand,
      query.skip,
      query.take,
      localUserID
    );
  }

  //#endregion
}
