import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
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
    ApiResponse,
    ApiTags
} from '@nestjs/swagger';
import { UpdateUserDto, UserDto } from '@common/dto/user/user.dto';
import { UsersService } from '../users/users.service';
import { LoggedInUser } from '@common/decorators/logged-in-user.decorator';
import { FollowStatusDto, UpdateFollowStatusDto } from '@common/dto/user/followers.dto';
import { ProfileDto } from '@common/dto/user/profile.dto';
import { MapNotifyDto, UpdateMapNotifyDto } from '@common/dto/map/map-notify.dto';
import { ApiOkPaginatedResponse, PaginatedResponseDto } from '@common/dto/paginated-response.dto';
import { ActivityDto } from '@common/dto/user/activity.dto';
import { PaginationQuery } from '@common/dto/query/pagination.dto';
import { NotificationDto, UpdateNotificationDto } from '@common/dto/user/notification.dto';
import { MapLibraryEntryDto } from '@common/dto/map/map-library-entry';
import {
    UserMapLibraryGetQuery,
    UserMapSubmittedGetQuery,
    UsersGetActivitiesQuery,
    UsersGetQuery
} from '@common/dto/query/user-queries.dto';
import { MapDto } from '@common/dto/map/map.dto';
import { MapFavoriteDto } from '@common/dto/map/map-favorite.dto';
import { MapLibraryService } from '@modules/maps/map-library.service';
import { MapSummaryDto } from '@common/dto/user/user-maps-summary.dto';

@Controller('api/user')
@ApiTags('User')
@ApiBearerAuth()
export class UserController {
    constructor(private readonly usersService: UsersService, private readonly mapLibraryService: MapLibraryService) {}

    //#region Main User Endpoints

    @Get()
    @ApiOperation({ summary: 'Get local user, based on JWT' })
    @ApiOkResponse({ type: UserDto, description: 'The logged in user data' })
    getUser(@LoggedInUser('id') userID: number, @Query() query?: UsersGetQuery): Promise<UserDto> {
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
    updateUser(@LoggedInUser('id') userID: number, @Body() updateDto: UpdateUserDto) {
        return this.usersService.update(userID, updateDto);
    }

    //#endregion

    //#region Profile

    @Get('/profile')
    @ApiOperation({ summary: 'Get local user, based on JWT' })
    @ApiOkResponse({ type: ProfileDto, description: "The logged in user's profile data" })
    @ApiNotFoundResponse({ description: 'Profile does not exist' })
    getProfile(@LoggedInUser('id') userID: number): Promise<ProfileDto> {
        return this.usersService.getProfile(userID);
    }

    @Delete('/profile/:type')
    @ApiOperation({ summary: 'Unlink the passed social account type' })
    @ApiParam({
        name: 'type',
        description: 'The type of social to enum',
        enum: ['twitter', 'discord', 'twitch'],
        type: String,
        required: true
    })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'The account was successfully unlinked' })
    @ApiBadRequestResponse({ description: 'Invalid social account' })
    unlinkSocial(@LoggedInUser('id') userID: number, @Param('type') type: string) {
        return this.usersService.unlinkSocial(userID, type);
    }

    //#endregion

    //#region Follows

    @Get('/follow/:userID')
    @ApiOperation({ summary: 'Returns the follow relationship between the local user and a target user' })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'ID of the user to check the follow status for',
        required: true
    })
    @ApiOkResponse({ type: FollowStatusDto, description: 'Follow status of the local user to the target user' })
    @ApiNotFoundResponse({ description: 'Target user does not exist' })
    getFollowStatus(
        @LoggedInUser('id') localUserID: number,
        @Param('userID', ParseIntPipe) targetUserID: number
    ): Promise<FollowStatusDto> {
        return this.usersService.getFollowStatus(localUserID, targetUserID);
    }

    @Post('/follow/:userID')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Follows the target user' })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'ID of the user to follow',
        required: true
    })
    @ApiNoContentResponse({ description: 'The user was successfully followed' })
    @ApiNotFoundResponse({ description: 'Target user does not exist' })
    followUser(@LoggedInUser('id') localUserID: number, @Param('userID', ParseIntPipe) targetUserID: number) {
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
        description: 'Flags expressing what activities the player wants to be notified of from the given user',
        required: true
    })
    @ApiNoContentResponse({ description: 'The follow activity flags were successfully updated' })
    @ApiNotFoundResponse({ description: 'Target user does not exist' })
    updateFollow(
        @LoggedInUser('id') localUserID: number,
        @Param('userID', ParseIntPipe) targetUserID: number,
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
    unfollowUser(@LoggedInUser('id') localUserID: number, @Param('userID', ParseIntPipe) targetUserID: number) {
        return this.usersService.unfollowUser(localUserID, targetUserID);
    }

    //#endregion

    //#region Map Notify

    @Get('/notifyMap/:mapID')
    @ApiOperation({ summary: 'Returns if the user has notifications for the given map' })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'ID of the map to check the notification for',
        required: true
    })
    @ApiOkResponse({ type: MapNotifyDto, description: 'MapNotifyDTO if map notify was found, empty if not' })
    @ApiNotFoundResponse({ description: 'The map does not exist' })
    getMapNotifyStatus(
        @LoggedInUser('id') userID: number,
        @Param('mapID', ParseIntPipe) mapID: number
    ): Promise<MapNotifyDto> {
        return this.usersService.getMapNotifyStatus(userID, mapID);
    }

    @Put('/notifyMap/:mapID')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Creates or updates the notification status for the given map' })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'ID of the map to create/update the notification for',
        required: true
    })
    @ApiBody({
        type: UpdateMapNotifyDto,
        description: 'Flags expressing what activities the player wants to be notified of from the given map',
        required: true
    })
    @ApiNoContentResponse({ description: 'The map notify flags were successfully updated' })
    @ApiBadRequestResponse({ description: 'Invalid notifyOn data' })
    @ApiNotFoundResponse({ description: 'The map does not exist' })
    updateMapNotify(
        @LoggedInUser('id') userID: number,
        @Param('mapID', ParseIntPipe) mapID: number,
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
    @ApiNoContentResponse({ description: 'Map notification was deleted successfully' })
    @ApiNotFoundResponse({ description: 'The map does not exist' })
    removeMapNotify(@LoggedInUser('id') userID: number, @Param('mapID', ParseIntPipe) mapID: number) {
        return this.usersService.removeMapNotify(userID, mapID);
    }

    //#endregion

    //#region Activities

    @Get('/activities')
    @ApiOperation({ summary: "Returns all of the local user's activities" })
    @ApiOkPaginatedResponse(UserDto, { description: "Paginated list of the local user's activites" })
    getActivities(
        @LoggedInUser('id') userID: number,
        @Query() query?: UsersGetActivitiesQuery
    ): Promise<PaginatedResponseDto<ActivityDto>> {
        return this.usersService.getActivities(userID, query.skip, query.take, query.type, query.data);
    }

    @Get('/activities/followed')
    @ApiOperation({ summary: "Returns activities of the user's followers" })
    @ApiParam({
        name: 'userID',
        type: Number,
        description: 'Target User ID',
        required: true
    })
    @ApiOkPaginatedResponse(UserDto, { description: "Paginated list of the activities of the user's followers" })
    getFollowedActivities(
        @LoggedInUser('id') userID: number,
        @Query() query?: UsersGetActivitiesQuery
    ): Promise<PaginatedResponseDto<ActivityDto>> {
        return this.usersService.getFollowedActivities(userID, query.skip, query.take, query.type, query.data);
    }

    //#endregion

    //#region Notifications

    @Get('/notifications')
    @ApiOperation({ summary: "Returns all of the local user's notifications" })
    @ApiOkPaginatedResponse(NotificationDto, { description: "Paginated list of the local user's notifications" })
    getNotifications(
        @LoggedInUser('id') userID: number,
        @Query() query?: PaginationQuery
    ): Promise<PaginatedResponseDto<NotificationDto>> {
        return this.usersService.getNotifications(userID, query.skip, query.take);
    }

    @Patch('/notifications/:notificationID')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Marks the given notification as read or unread' })
    @ApiBody({
        type: UpdateNotificationDto,
        description: 'Bool expressing whether the notification has been read or not',
        required: true
    })
    @ApiNoContentResponse({ description: 'Notification was updated successfully' })
    @ApiBadRequestResponse({ description: 'Invalid read data' })
    @ApiNotFoundResponse({ description: 'The notification does not exist' })
    updateNotification(
        @LoggedInUser('id') userID: number,
        @Param('notificationID', ParseIntPipe) notificationID: number,
        @Body() updateDto: UpdateNotificationDto
    ) {
        return this.usersService.updateNotification(userID, notificationID, updateDto);
    }

    @Delete('/notifications/:notificationID')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Notification was deleted successfully' })
    @ApiOperation({ summary: 'Deletes the given notification' })
    @ApiNotFoundResponse({ description: 'The notification does not exist' })
    deleteNotification(
        @LoggedInUser('id') userID: number,
        @Param('notificationID', ParseIntPipe) notificationID: number
    ) {
        return this.usersService.deleteNotification(userID, notificationID);
    }

    //#endregion

    //#region Map Library

    @Get('/maps/library')
    @ApiOperation({ summary: "Returns the maps in the local user's library" })
    @ApiOkPaginatedResponse(MapLibraryEntryDto, { description: 'Paginated list of the library entries' })
    getMapLibraryEntry(
        @LoggedInUser('id') userID: number,
        @Query() query?: UserMapLibraryGetQuery
    ): Promise<PaginatedResponseDto<MapLibraryEntryDto>> {
        return this.usersService.getMapLibraryEntry(userID, query.skip, query.take, query.search, query.expand);
    }

    @Get('/maps/library/:mapID')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Return 204 if the map is in the user's library, 404 otherwise" })
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
        @Param('mapID', ParseIntPipe) mapID: number
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
    addMapLibraryEntry(@LoggedInUser('id') userID: number, @Param('mapID', ParseIntPipe) mapID: number) {
        return this.usersService.addMapLibraryEntry(userID, mapID);
    }

    @Delete('/maps/library/:mapID')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Removes the given map from the local user's library" })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'ID of the map to remove from the library',
        required: true
    })
    @ApiNoContentResponse({ description: 'Map was removed from the library' })
    @ApiNotFoundResponse({ description: 'The map does not exist' })
    removeMapLibraryEntry(@LoggedInUser('id') userID: number, @Param('mapID', ParseIntPipe) mapID: number) {
        return this.usersService.removeMapLibraryEntry(userID, mapID);
    }

    //#endregion

    //#region Map Favorites

    @Get('/maps/favorites')
    @ApiOperation({ summary: "Returns the maps in the local user's favorites" })
    @ApiOkPaginatedResponse(MapFavoriteDto, { description: 'Paginated list of favorited maps' })
    getFavoritedMaps(
        @LoggedInUser('id') userID: number,
        @Query() query?: UserMapLibraryGetQuery
    ): Promise<PaginatedResponseDto<MapFavoriteDto>> {
        return this.usersService.getFavoritedMaps(userID, query.skip, query.take, query.search, query.expand);
    }

    @Get('/maps/favorites/:mapID')
    @ApiOperation({ summary: "Return 204 if the map is in the user's favorites, 404 otherwise" })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'ID of the map to check',
        required: true
    })
    @ApiNoContentResponse({ description: 'Map is in the favorites' })
    @ApiNotFoundResponse({ description: 'Map is not in the favorites' })
    checkFavoritedMap(@LoggedInUser('id') _userID: number, @Param('mapID', ParseIntPipe) _mapID: number) {
        return void 0;
        //return this.usersService.CheckFavoritedMap(userID, mapID);
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
    addFavoritedMap(@LoggedInUser('id') userID: number, @Param('mapID', ParseIntPipe) mapID: number) {
        return this.usersService.addFavoritedMap(userID, mapID);
    }

    @Delete('/maps/favorites/:mapID')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Removes the given map from the local user's favorites" })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'ID of the map to remove from the favorites',
        required: true
    })
    @ApiNoContentResponse({ description: 'Map was removed from the favorites' })
    @ApiNotFoundResponse({ description: 'The map does not exist' })
    removeFavoritedMap(@LoggedInUser('id') userID: number, @Param('mapID', ParseIntPipe) mapID: number) {
        return this.usersService.removeFavoritedMap(userID, mapID);
    }

    //#endregion

    //#region Map Submissions

    @Get('/maps/submitted')
    @ApiOperation({ summary: 'Returns the maps submitted by the local user' })
    @ApiOkPaginatedResponse(MapDto, { description: 'Paginated list of submitted maps' })
    getSubmittedMaps(
        @LoggedInUser('id') userID: number,
        @Query() query?: UserMapSubmittedGetQuery
    ): Promise<PaginatedResponseDto<MapDto>> {
        return this.usersService.getSubmittedMaps(userID, query.skip, query.take, query.search, query.expand);
    }

    @Get('/maps/submitted/summary')
    @ApiOkPaginatedResponse(MapSummaryDto, { description: 'The users map statusFlags and their count' })
    @ApiOperation({ summary: 'Returns the summary of maps submitted by the local user' })
    @ApiOkResponse({ type: MapSummaryDto, isArray: true, description: 'Summary of maps submitted by the local user' })
    getSubmittedMapsSummary(@LoggedInUser('id') userID: number): Promise<MapSummaryDto[]> {
        return this.usersService.getSubmittedMapsSummary(userID);
    }

    //#endregion
}
