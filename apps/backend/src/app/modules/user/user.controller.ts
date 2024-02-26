import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from '@nestjs/swagger';
import { LoggedInUser } from '../../decorators';
import {
  ActivityDto,
  ApiOkPagedResponse,
  FollowStatusDto,
  MapDto,
  MapFavoriteDto,
  MapLibraryEntryDto,
  MapNotifyDto,
  MapSummaryDto,
  PagedResponseDto,
  ProfileDto,
  UpdateFollowStatusDto,
  UpdateMapNotifyDto,
  UpdateUserDto,
  UserDto,
  UserMapLibraryGetQueryDto,
  UsersGetActivitiesQueryDto,
  UsersGetQueryDto,
  UserMapFavoritesGetQueryDto,
  FollowDto,
  MapsGetAllUserSubmissionQueryDto,
  MapsGetAllSubmissionQueryDto
} from '../../dto';
import { ParseIntSafePipe } from '../../pipes';
import { MapLibraryService } from '../maps/map-library.service';
import { UsersService } from '../users/users.service';
import { MapsService } from '../maps/maps.service';

@Controller('user')
@ApiTags('User')
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly mapLibraryService: MapLibraryService,
    private readonly mapsService: MapsService
  ) {}

  //#region Main User Endpoints

  @Get()
  @ApiOperation({ summary: 'Get local user, based on JWT' })
  @ApiOkResponse({ type: UserDto, description: 'The logged in user data' })
  getUser(
    @LoggedInUser('id') userID: number,
    @Query() query?: UsersGetQueryDto
  ): Promise<UserDto> {
    return this.usersService.get(userID, query.expand);
  }

  @Patch()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Update the local users's data" })
  @ApiBody({
    type: UpdateUserDto,
    description: 'Update user data transfer object',
    required: true
  })
  @ApiNoContentResponse({ description: 'The user was successfully updated' })
  @ApiBadRequestResponse({ description: 'Invalid update data' })
  updateUser(
    @LoggedInUser('id') userID: number,
    @Body() updateDto: UpdateUserDto
  ) {
    return this.usersService.update(userID, updateDto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete the local users's data" })
  @ApiNoContentResponse({ description: 'The user was successfully deleted' })
  deleteUser(@LoggedInUser('id') userID: number) {
    return this.usersService.delete(userID);
  }

  //#endregion

  //#region Profile

  @Get('/profile')
  @ApiOperation({ summary: 'Get local user, based on JWT' })
  @ApiOkResponse({
    type: ProfileDto,
    description: "The logged in user's profile data"
  })
  @ApiNotFoundResponse({ description: 'Profile does not exist' })
  getProfile(@LoggedInUser('id') userID: number): Promise<ProfileDto> {
    return this.usersService.getProfile(userID);
  }

  //#endregion

  //#region Follows

  @Get('/follow/:userID')
  @ApiOperation({
    summary:
      'Returns the follow relationship between the local user and a target user'
  })
  @ApiParam({
    name: 'userID',
    type: Number,
    description: 'ID of the user to check the follow status for',
    required: true
  })
  @ApiOkResponse({
    type: FollowStatusDto,
    description: 'Follow status of the local user to the target user'
  })
  @ApiNotFoundResponse({ description: 'Target user does not exist' })
  getFollowStatus(
    @LoggedInUser('id') localUserID: number,
    @Param('userID', ParseIntSafePipe) targetUserID: number
  ): Promise<FollowStatusDto> {
    return this.usersService.getFollowStatus(localUserID, targetUserID);
  }

  @Post('/follow/:userID')
  @ApiOperation({ summary: 'Follows the target user' })
  @ApiParam({
    name: 'userID',
    type: Number,
    description: 'ID of the user to follow',
    required: true
  })
  @ApiOkResponse({
    type: FollowDto,
    description: 'The follow DTO of the local user following the target user'
  })
  @ApiNotFoundResponse({ description: 'Target user does not exist' })
  followUser(
    @LoggedInUser('id') localUserID: number,
    @Param('userID', ParseIntSafePipe) targetUserID: number
  ): Promise<FollowDto> {
    return this.usersService.followUser(localUserID, targetUserID);
  }

  @Patch('/follow/:userID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Follows the target user' })
  @ApiParam({
    name: 'userID',
    type: Number,
    description: 'ID of user to modify the follow for',
    required: true
  })
  @ApiBody({
    type: UpdateFollowStatusDto,
    description:
      'Flags expressing what activities the player wants to be notified of from the given user',
    required: true
  })
  @ApiNoContentResponse({
    description: 'The follow activity flags were successfully updated'
  })
  @ApiNotFoundResponse({ description: 'Target user does not exist' })
  updateFollow(
    @LoggedInUser('id') localUserID: number,
    @Param('userID', ParseIntSafePipe) targetUserID: number,
    @Body() updateDto: UpdateFollowStatusDto
  ) {
    return this.usersService.updateFollow(localUserID, targetUserID, updateDto);
  }

  @Delete('/follow/:userID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unfollows the target user' })
  @ApiParam({
    name: 'userID',
    type: Number,
    description: 'ID of the user to unfollow',
    required: true
  })
  @ApiNoContentResponse({ description: 'The user was successfully unfollowed' })
  @ApiNotFoundResponse({ description: 'Target user or follow does not exist' })
  unfollowUser(
    @LoggedInUser('id') localUserID: number,
    @Param('userID', ParseIntSafePipe) targetUserID: number
  ) {
    return this.usersService.unfollowUser(localUserID, targetUserID);
  }

  //#endregion

  //#region Map Notify

  @Get('/notifyMap/:mapID')
  @ApiOperation({
    summary: 'Returns if the user has notifications for the given map'
  })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'ID of the map to check the notification for',
    required: true
  })
  @ApiOkResponse({
    type: MapNotifyDto,
    description: 'MapNotifyDTO if map notify was found, empty if not'
  })
  @ApiNotFoundResponse({ description: 'The map does not exist' })
  getMapNotifyStatus(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number
  ): Promise<MapNotifyDto> {
    return this.usersService.getMapNotifyStatus(userID, mapID);
  }

  @Put('/notifyMap/:mapID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Creates or updates the notification status for the given map'
  })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'ID of the map to create/update the notification for',
    required: true
  })
  @ApiBody({
    type: UpdateMapNotifyDto,
    description:
      'Flags expressing what activities the player wants to be notified of from the given map',
    required: true
  })
  @ApiNoContentResponse({
    description: 'The map notify flags were successfully updated'
  })
  @ApiBadRequestResponse({ description: 'Invalid notifyOn data' })
  @ApiNotFoundResponse({ description: 'The map does not exist' })
  updateMapNotify(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @Body() updateDto: UpdateMapNotifyDto
  ) {
    return this.usersService.updateMapNotify(userID, mapID, updateDto);
  }

  @Delete('/notifyMap/:mapID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disables notifications for the given map' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'ID of the map to delete the notification for',
    required: true
  })
  @ApiNoContentResponse({
    description: 'Map notification was deleted successfully'
  })
  @ApiNotFoundResponse({ description: 'The map does not exist' })
  removeMapNotify(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number
  ) {
    return this.usersService.removeMapNotify(userID, mapID);
  }

  //#endregion

  //#region Activities

  @Get('/activities')
  @ApiOperation({ summary: "Returns all of the local user's activities" })
  @ApiOkPagedResponse(UserDto, {
    description: "Paginated list of the local user's activites"
  })
  getActivities(
    @LoggedInUser('id') userID: number,
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

  @Get('/activities/followed')
  @ApiOperation({ summary: "Returns activities of the user's followers" })
  @ApiParam({
    name: 'userID',
    type: Number,
    description: 'Target User ID',
    required: true
  })
  @ApiOkPagedResponse(UserDto, {
    description: "Paginated list of the activities of the user's followers"
  })
  getFollowedActivities(
    @LoggedInUser('id') userID: number,
    @Query() query?: UsersGetActivitiesQueryDto
  ): Promise<PagedResponseDto<ActivityDto>> {
    return this.usersService.getFollowedActivities(
      userID,
      query.skip,
      query.take,
      query.type,
      query.data
    );
  }

  //#endregion

  //#region Map Library

  @Get('/maps/library')
  @ApiOperation({ summary: "Returns the maps in the local user's library" })
  @ApiOkPagedResponse(MapLibraryEntryDto, {
    description: 'Paginated list of the library entries'
  })
  getMapLibraryEntry(
    @LoggedInUser('id') userID: number,
    @Query() query?: UserMapLibraryGetQueryDto
  ): Promise<PagedResponseDto<MapLibraryEntryDto>> {
    return this.usersService.getMapLibraryEntries(
      userID,
      query.skip,
      query.take,
      query.search,
      query.expand
    );
  }

  @Get('/maps/library/:mapID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Return 204 if the map is in the user's library, 404 otherwise"
  })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'ID of the map to check',
    required: true
  })
  @ApiNoContentResponse({ description: 'Map is in the library' })
  @ApiNotFoundResponse({ description: 'Map is not in the library' })
  checkMapLibraryEntry(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number
  ): Promise<void> {
    return this.mapLibraryService.isMapInLibrary(userID, mapID);
  }

  @Put('/maps/library/:mapID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Adds the given map to the local user's library" })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'ID of the map to add to the library',
    required: true
  })
  @ApiNoContentResponse({ description: 'Map was added to the library' })
  @ApiNotFoundResponse({ description: 'The map does not exist' })
  addMapLibraryEntry(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number
  ) {
    return this.usersService.addMapLibraryEntry(userID, mapID);
  }

  @Delete('/maps/library/:mapID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Removes the given map from the local user's library"
  })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'ID of the map to remove from the library',
    required: true
  })
  @ApiNoContentResponse({ description: 'Map was removed from the library' })
  @ApiNotFoundResponse({ description: 'The map does not exist' })
  removeMapLibraryEntry(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number
  ) {
    return this.usersService.removeMapLibraryEntry(userID, mapID);
  }

  //#endregion

  //#region Map Favorites

  @Get('/maps/favorites')
  @ApiOperation({ summary: "Returns the maps in the local user's favorites" })
  @ApiOkPagedResponse(MapFavoriteDto, {
    description: 'Paginated list of favorited maps'
  })
  getFavoritedMaps(
    @LoggedInUser('id') userID: number,
    @Query() query?: UserMapFavoritesGetQueryDto
  ): Promise<PagedResponseDto<MapFavoriteDto>> {
    return this.usersService.getFavoritedMaps(
      userID,
      query.skip,
      query.take,
      query.search,
      query.expand
    );
  }

  @Get('/maps/favorites/:mapID')
  @ApiOperation({
    summary: "Return 204 if the map is in the user's favorites, 404 otherwise"
  })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'ID of the map to check',
    required: true
  })
  @ApiNoContentResponse({ description: 'Map is in the favorites' })
  @ApiNotFoundResponse({ description: 'Map is not in the favorites' })
  checkFavoritedMap(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number
  ) {
    return this.usersService.checkFavoritedMap(userID, mapID);
  }

  @Put('/maps/favorites/:mapID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Adds the given map to the local user's favorites" })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'ID of the map to add to the favorites',
    required: true
  })
  @ApiNoContentResponse({ description: 'Map was added to the favorites' })
  @ApiNotFoundResponse({ description: 'The map does not exist' })
  addFavoritedMap(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number
  ) {
    return this.usersService.addFavoritedMap(userID, mapID);
  }

  @Delete('/maps/favorites/:mapID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Removes the given map from the local user's favorites"
  })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'ID of the map to remove from the favorites',
    required: true
  })
  @ApiNoContentResponse({ description: 'Map was removed from the favorites' })
  @ApiNotFoundResponse({ description: 'The map does not exist' })
  removeFavoritedMap(
    @LoggedInUser('id') userID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number
  ) {
    return this.usersService.removeFavoritedMap(userID, mapID);
  }

  //#endregion

  //#region Map Submissions

  @Get('/maps/submitted')
  @ApiOperation({ summary: 'Returns the maps submitted by the local user' })
  @ApiOkPagedResponse(MapDto, {
    description: 'Paginated list of submitted maps'
  })
  getSubmittedMaps(
    @LoggedInUser('id') userID: number,
    @Query() query?: MapsGetAllUserSubmissionQueryDto
  ): Promise<PagedResponseDto<MapDto>> {
    return this.mapsService.getAll(userID, {
      ...query,
      submitterID: userID
    } as MapsGetAllSubmissionQueryDto);
  }

  @Get('/maps/submitted/summary')
  @ApiOkPagedResponse(MapSummaryDto, {
    description:
      'The amount of each map submitted by a user of a each possible status'
  })
  @ApiOperation({
    summary: 'Returns the summary of maps submitted by the local user'
  })
  @ApiOkResponse({
    type: MapSummaryDto,
    isArray: true,
    description: 'Summary of maps submitted by the local user'
  })
  getSubmittedMapsSummary(
    @LoggedInUser('id') userID: number
  ): Promise<MapSummaryDto[]> {
    return this.mapsService.getSubmittedMapsSummary(userID);
  }

  //#endregion
}
