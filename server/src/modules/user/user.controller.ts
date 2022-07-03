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
import { UpdateUserDto, UserDto } from '../../@common/dto/user/user.dto';
import { UsersService } from '../users/users.service';
import { LoggedInUser } from '../../@common/decorators/logged-in-user.decorator';
import { FollowStatusDto, UpdateFollowStatusDto } from '../../@common/dto/user/followers.dto';
import { ProfileDto } from '../../@common/dto/user/profile.dto';
import { MapNotifyDto, UpdateMapNotifyDto } from '../../@common/dto/map/map-notify.dto';
import { ApiOkPaginatedResponse, PaginatedResponseDto } from '../../@common/dto/paginated-response.dto';
import { ActivityDto } from '../../@common/dto/user/activity.dto';
import { PaginationQuery } from '../../@common/dto/query/pagination.dto';
import { NotificationDto, UpdateNotificationDto } from '../../@common/dto/user/notification.dto';
import { MapLibraryEntryDto } from '../../@common/dto/map/map-library-entry';
import {
    UserMapLibraryGetQuery,
    UserMapSubmittedGetQuery,
    UsersGetActivitiesQuery,
    UsersGetQuery
} from '../../@common/dto/query/user-queries.dto';
import { MapDto } from '../../@common/dto/map/map.dto';
import { MapFavoriteDto } from '../../@common/dto/map/map-favorite.dto';

@ApiBearerAuth()
@Controller('api/v1/user')
@ApiTags('User')
export class UserController {
    constructor(private readonly usersService: UsersService) {}

    //#region Main User Endpoints

    @Get()
    @ApiOperation({ summary: 'Get local user, based on JWT' })
    @ApiOkResponse({ type: UserDto, description: 'The logged in user data' })
    public GetUser(@LoggedInUser('id') userID: number, @Query() query?: UsersGetQuery): Promise<UserDto> {
        return this.usersService.Get(userID, query.expand);
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
    public UpdateUser(@LoggedInUser('id') userID: number, @Body() updateDto: UpdateUserDto) {
        return this.usersService.Update(userID, updateDto);
    }

    //#endregion

    //#region Profile

    @Get('/profile')
    @ApiOperation({ summary: 'Get local user, based on JWT' })
    @ApiOkResponse({ type: ProfileDto, description: "The logged in user's profile data" })
    @ApiNotFoundResponse({ description: 'Profile does not exist' })
    public GetProfile(@LoggedInUser('id') userID: number): Promise<ProfileDto> {
        return this.usersService.GetProfile(userID);
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
    public UnlinkSocial(@LoggedInUser('id') userID: number, @Param('type') type: string) {
        return this.usersService.UnlinkSocial(userID, type);
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
    public GetFollowStatus(
        @LoggedInUser('id') localUserID: number,
        @Param('userID', ParseIntPipe) targetUserID: number
    ): Promise<FollowStatusDto> {
        return this.usersService.GetFollowStatus(localUserID, targetUserID);
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
    public FollowUser(@LoggedInUser('id') localUserID: number, @Param('userID', ParseIntPipe) targetUserID: number) {
        return this.usersService.FollowUser(localUserID, targetUserID);
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
    public UpdateFollow(
        @LoggedInUser('id') localUserID: number,
        @Param('userID', ParseIntPipe) targetUserID: number,
        @Body() updateDto: UpdateFollowStatusDto
    ) {
        return this.usersService.UpdateFollow(localUserID, targetUserID, updateDto);
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
    public UnfollowUser(@LoggedInUser('id') localUserID: number, @Param('userID', ParseIntPipe) targetUserID: number) {
        return this.usersService.UnfollowUser(localUserID, targetUserID);
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
    public GetMapNotifyStatus(
        @LoggedInUser('id') userID: number,
        @Param('mapID', ParseIntPipe) mapID: number
    ): Promise<MapNotifyDto> {
        return this.usersService.GetMapNotifyStatus(userID, mapID);
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
    public UpdateMapNotify(
        @LoggedInUser('id') userID: number,
        @Param('mapID', ParseIntPipe) mapID: number,
        @Body() updateDto: UpdateMapNotifyDto
    ) {
        return this.usersService.UpdateMapNotify(userID, mapID, updateDto);
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
    public RemoveMapNotify(@LoggedInUser('id') userID: number, @Param('mapID', ParseIntPipe) mapID: number) {
        return this.usersService.RemoveMapNotify(userID, mapID);
    }

    //#endregion

    //#region Activities

    @Get('/activities')
    @ApiOperation({ summary: "Returns all of the local user's activities" })
    @ApiOkPaginatedResponse(UserDto, { description: "Paginated list of the local user's activites" })
    public GetActivities(
        @LoggedInUser('id') userID: number,
        @Query() query?: UsersGetActivitiesQuery
    ): Promise<PaginatedResponseDto<ActivityDto>> {
        return this.usersService.GetActivities(userID, query.skip, query.take, query.type, query.data);
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
    public GetFollowedActivities(
        @LoggedInUser('id') userID: number,
        @Query() query?: UsersGetActivitiesQuery
    ): Promise<PaginatedResponseDto<ActivityDto>> {
        return this.usersService.GetFollowedActivities(userID, query.skip, query.take, query.type, query.data);
    }

    //#endregion

    //#region Notifications

    @Get('/notifications')
    @ApiOperation({ summary: "Returns all of the local user's notifications" })
    @ApiOkPaginatedResponse(NotificationDto, { description: "Paginated list of the local user's notifications" })
    public GetNotifications(
        @LoggedInUser('id') userID: number,
        @Query() query?: PaginationQuery
    ): Promise<PaginatedResponseDto<NotificationDto>> {
        return this.usersService.GetNotifications(userID, query.skip, query.take);
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
    public UpdateNotification(
        @LoggedInUser('id') userID: number,
        @Param('notificationID', ParseIntPipe) notificationID: number,
        @Body() updateDto: UpdateNotificationDto
    ) {
        return this.usersService.UpdateNotification(userID, notificationID, updateDto);
    }

    @Delete('/notifications/:notificationID')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'Notification was deleted successfully' })
    @ApiOperation({ summary: 'Deletes the given notification' })
    @ApiNotFoundResponse({ description: 'The notification does not exist' })
    public DeleteNotification(
        @LoggedInUser('id') userID: number,
        @Param('notificationID', ParseIntPipe) notificationID: number
    ) {
        return this.usersService.DeleteNotification(userID, notificationID);
    }

    //#endregion

    //#region Map Library

    @Get('/maps/library')
    @ApiOperation({ summary: "Returns the maps in the local user's library" })
    @ApiOkPaginatedResponse(MapLibraryEntryDto, { description: 'Paginated list of the library entries' })
    public GetMapLibraryEntry(
        @LoggedInUser('id') userID: number,
        @Query() query?: UserMapLibraryGetQuery
    ): Promise<PaginatedResponseDto<MapLibraryEntryDto>> {
        return this.usersService.GetMapLibraryEntry(userID, query.skip, query.take, query.search, query.expand);
    }

    @Get('/maps/library/:mapID')
    @ApiOperation({ summary: "Return 204 if the map is in the user's library, 404 otherwise" })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'ID of the map to check',
        required: true
    })
    @ApiNoContentResponse({ description: 'Map is in the library' })
    @ApiNotFoundResponse({ description: 'Map is not in the library' })
    public CheckMapLibraryEntry(@LoggedInUser('id') userID: number, @Param('mapID', ParseIntPipe) mapID: number) {
        return void 0;
        //return this.usersService.CheckMapLibraryEntry(userID, mapID);
    }

    @Put('/maps/library/:mapID')
    @ApiOperation({ summary: "Adds the given map to the local user's library" })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'ID of the map to add to the library',
        required: true
    })
    @ApiNoContentResponse({ description: 'Map was added to the library' })
    @ApiNotFoundResponse({ description: 'The map does not exist' })
    public AddMapLibraryEntry(@LoggedInUser('id') userID: number, @Param('mapID', ParseIntPipe) mapID: number) {
        return void 0;
        //return this.usersService.AddMapLibraryEntry(userID, mapID);
    }

    @Delete('/maps/library/:mapID')
    @ApiOperation({ summary: "Removes the given map from the local user's library" })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'ID of the map to remove from the library',
        required: true
    })
    @ApiNoContentResponse({ description: 'Map was removed from the library' })
    @ApiNotFoundResponse({ description: 'The map does not exist' })
    public RemoveMapLibraryEntry(@LoggedInUser('id') userID: number, @Param('mapID', ParseIntPipe) mapID: number) {
        return void 0;
        //return this.usersService.RemoveMapLibraryEntry(userID, mapID);
    }

    //#endregion

    //#region Map Favorites

    @Get('/maps/favorites')
    @ApiOperation({ summary: "Returns the maps in the local user's favorites" })
    @ApiOkPaginatedResponse(MapFavoriteDto, { description: 'Paginated list of favorited maps' })
    public GetFavoritedMaps(
        @LoggedInUser('id') userID: number,
        @Query() query?: UserMapLibraryGetQuery
    ): Promise<PaginatedResponseDto<MapFavoriteDto>> {
        return this.usersService.GetFavoritedMaps(userID, query.skip, query.take, query.search, query.expand);
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
    public CheckFavoritedMap(@LoggedInUser('id') userID: number, @Param('mapID', ParseIntPipe) mapID: number) {
        return void 0;
        //return this.usersService.CheckFavoritedMap(userID, mapID);
    }

    @Put('/maps/favorites/:mapID')
    @ApiOperation({ summary: "Adds the given map to the local user's favorites" })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'ID of the map to add to the favorites',
        required: true
    })
    @ApiNoContentResponse({ description: 'Map was added to the favorites' })
    @ApiNotFoundResponse({ description: 'The map does not exist' })
    public AddFavoritedMap(@LoggedInUser('id') userID: number, @Param('mapID', ParseIntPipe) mapID: number) {
        return void 0;
        //return this.usersService.AddFavoritedMap(userID, mapID);
    }

    @Delete('/maps/favorites/:mapID')
    @ApiOperation({ summary: "Removes the given map from the local user's favorites" })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'ID of the map to remove from the favorites',
        required: true
    })
    @ApiNoContentResponse({ description: 'Map was removed from the favorites' })
    @ApiNotFoundResponse({ description: 'The map does not exist' })
    public RemoveFavoritedMap(@LoggedInUser('id') userID: number, @Param('mapID', ParseIntPipe) mapID: number) {
        return void 0;
        //return this.usersService.RemoveFavoritedMap(userID, mapID);
    }

    //#endregion

    //#region Map Submissions

    @Get('/maps/submitted')
    @ApiOperation({ summary: 'Returns the maps submitted by the local user' })
    @ApiOkPaginatedResponse(MapDto, { description: 'Paginated list of submitted maps' })
    public GetSubmittedMaps(
        @LoggedInUser('id') userID: number,
        @Query() query?: UserMapSubmittedGetQuery
    ): Promise<PaginatedResponseDto<MapDto>> {
        return void 0;
        //return this.usersService.GetSubmittedMaps(userID, query.skip, query.take, query.search, query.expand);
    }

    // I dunno what this last one is, check old API!
    @Get('/maps/submitted/summary')
    @ApiOperation({ summary: 'Returns the summary of maps submitted by the local user' })
    @ApiOkResponse({ description: 'Summary of maps submitted by the local user' })
    public GetSubmittedMapsSummary(@LoggedInUser('id') userID: number) /*: Promise<who knows???> */ {
        return void 0;
    }

    //#endregion
}
