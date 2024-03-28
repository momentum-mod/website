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
  Query,
  UseGuards
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
import { Role as RolesEnum } from '@momentum/constants';
import { RolesGuard } from '../auth/roles.guard';
import { NonGameAuthGuard } from '../auth/jwt/game.guard';
import { LoggedInUser, Roles } from '../../decorators';
import { MapsService } from '../maps/maps.service';
import { UsersService } from '../users/users.service';
import {
  AdminActivityDto,
  AdminGetAdminActivitiesQueryDto,
  AdminGetReportsQueryDto,
  AdminUpdateMapReviewDto,
  AdminUpdateUserDto,
  ApiOkPagedResponse,
  CreateUserDto,
  MapDto,
  MapReviewDto,
  MapsGetAllAdminQueryDto,
  MergeUserDto,
  PagedResponseDto,
  ReportDto,
  UpdateMapAdminDto,
  UpdateReportDto,
  UserDto
} from '../../dto';
import { ParseIntSafePipe } from '../../pipes';
import { AdminService } from './admin.service';
import { AdminActivityService } from './admin-activity.service';
import { MapReviewService } from '../map-review/map-review.service';

@Controller('admin')
@UseGuards(RolesGuard)
@UseGuards(NonGameAuthGuard)
@Roles(RolesEnum.ADMIN)
@ApiTags('Admin')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly mapsService: MapsService,
    private readonly mapReviewService: MapReviewService,
    private readonly usersService: UsersService,
    private readonly adminActivityService: AdminActivityService
  ) {}

  @Post('/users')
  @ApiBody({
    type: CreateUserDto,
    description: 'The alias of the placeholder user',
    required: true
  })
  @ApiOperation({ summary: 'Create a placeholder user' })
  @ApiOkResponse({ type: UserDto, description: 'The newly created user' })
  createPlaceholderUser(
    @LoggedInUser('id') adminID: number,
    @Body() body: CreateUserDto
  ): Promise<UserDto> {
    return this.adminService.createPlaceholderUser(adminID, body.alias);
  }

  @Post('/users/merge')
  @ApiBody({
    type: MergeUserDto,
    description: 'DTO of IDs of the placeholder user and the actual user',
    required: true
  })
  @ApiOperation({
    summary:
      'Create a placeholder user, used when a placeholder should be merged with a real user, generally mappers.'
  })
  @ApiOkResponse({ type: UserDto, description: 'The merged user' })
  @ApiNotFoundResponse({
    description: 'If either ID does not correspond to a user'
  })
  @ApiBadRequestResponse({
    description: 'If the placeholder ID is not a placeholder'
  })
  mergeUsers(
    @LoggedInUser('id') adminID: number,
    @Body() body: MergeUserDto
  ): Promise<UserDto> {
    return this.adminService.mergeUsers(
      adminID,
      body.placeholderID,
      body.userID
    );
  }

  @Patch('/users/:userID')
  @Roles(RolesEnum.ADMIN, RolesEnum.MODERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Update the target user's data" })
  @ApiParam({
    name: 'userID',
    type: Number,
    description: 'ID of the user to update',
    required: true
  })
  @ApiBody({
    type: AdminUpdateUserDto,
    description: 'The data to update on the user',
    required: true
  })
  @ApiNoContentResponse({ description: 'The user was updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid user update data' })
  updateUser(
    @LoggedInUser('id') adminID: number,
    @Param('userID', ParseIntSafePipe) userID: number,
    @Body() body: AdminUpdateUserDto
  ) {
    return this.adminService.updateUser(adminID, userID, body);
  }

  @Delete('/users/:userID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete the target user' })
  @ApiParam({
    name: 'userID',
    type: Number,
    description: 'ID of the user to delete',
    required: true
  })
  @ApiNoContentResponse({ description: 'The user was deleted successfully' })
  deleteUser(
    @LoggedInUser('id') adminID: number,
    @Param('userID', ParseIntSafePipe) userID: number
  ) {
    return this.usersService.delete(userID, adminID);
  }

  @Roles(RolesEnum.ADMIN, RolesEnum.MODERATOR)
  @Get('/maps')
  @ApiOperation({
    description:
      'Retrieve a paginated list of approved maps with extra admin filtration'
  })
  @ApiOkPagedResponse(MapDto, { description: 'Paginated list of maps' })
  @ApiBadRequestResponse({ description: 'Invalid query data' })
  getMaps(
    @LoggedInUser('id') userID: number,
    @Query() query: MapsGetAllAdminQueryDto
  ): Promise<PagedResponseDto<MapDto>> {
    return this.mapsService.getAll(query, userID);
  }

  @Patch('/maps/:mapID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(RolesEnum.REVIEWER, RolesEnum.MODERATOR, RolesEnum.ADMIN)
  @ApiOperation({ summary: "Update a map's data / change its status" })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'ID of the map to update',
    required: true
  })
  @ApiNoContentResponse({ description: 'The map was updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid map update data' })
  updateMap(
    @Param('mapID', ParseIntSafePipe) mapID: number,
    @LoggedInUser('id') userID: number,
    @Body() body: UpdateMapAdminDto
  ) {
    return this.mapsService.updateAsAdmin(mapID, userID, body);
  }

  @Delete('/maps/:mapID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disables a map and deletes any files' })
  @ApiParam({
    name: 'mapID',
    type: Number,
    description: 'ID of the map to delete',
    required: true
  })
  deleteMap(
    @LoggedInUser('id') adminID: number,
    @Param('mapID', ParseIntSafePipe) mapID: number
  ) {
    return this.mapsService.delete(mapID, adminID);
  }

  @Get('/reports')
  @Roles(RolesEnum.ADMIN, RolesEnum.MODERATOR)
  @ApiOperation({ description: 'Retrieve a list of reports' })
  @ApiOkPagedResponse(ReportDto, {
    description: 'Paginated list of reports'
  })
  @ApiBadRequestResponse({ description: 'Invalid query data' })
  getReports(
    @Query() query: AdminGetReportsQueryDto
  ): Promise<PagedResponseDto<ReportDto>> {
    return this.adminService.getReports(
      query.skip,
      query.take,
      query.expand,
      query.resolved
    );
  }

  @Patch('/reports/:reportID')
  @Roles(RolesEnum.ADMIN, RolesEnum.MODERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update the target report' })
  @ApiParam({
    name: 'reportID',
    type: Number,
    description: 'ID of the report to update',
    required: true
  })
  @ApiBody({
    type: UpdateReportDto,
    description: 'The updated resolution message and status',
    required: true
  })
  @ApiNoContentResponse({ description: 'The report was updated successfully' })
  updateReport(
    @LoggedInUser('id') userID: number,
    @Param('reportID', ParseIntSafePipe) reportID: number,
    @Body() body: UpdateReportDto
  ) {
    return this.adminService.updateReport(userID, reportID, body);
  }

  @Patch('/map-review/:reviewID')
  @Roles(RolesEnum.ADMIN, RolesEnum.MODERATOR, RolesEnum.REVIEWER)
  @ApiOperation({ summary: 'Resolve or unresolve a map review' })
  @ApiOkResponse({ type: MapReviewDto, description: 'The updated review' })
  @ApiNotFoundResponse({ description: 'Map not found' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @ApiBody({ type: AdminUpdateMapReviewDto, required: true })
  updateMapReview(
    @Body() body: AdminUpdateMapReviewDto,
    @Param('reviewID', ParseIntSafePipe) reviewID: number,
    @LoggedInUser('id') userID: number
  ): Promise<MapReviewDto> {
    return this.mapReviewService.updateReviewAsReviewer(reviewID, userID, body);
  }

  @Delete('/map-review/:reviewID')
  @Roles(RolesEnum.ADMIN, RolesEnum.MODERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a map review' })
  @ApiNoContentResponse({ description: 'Review deleted successfully' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  deleteMapReview(
    @Param('reviewID', ParseIntSafePipe) reviewID: number,
    @LoggedInUser('id') userID: number
  ): Promise<void> {
    return this.mapReviewService.deleteReview(reviewID, userID, true);
  }

  @Get('/activities')
  @Roles(RolesEnum.ADMIN, RolesEnum.MODERATOR)
  @ApiOperation({
    description: 'Get list of all admin activities'
  })
  @ApiOkResponse({
    type: AdminActivityDto,
    description: 'List of admin activities'
  })
  getAllAdminActivities(
    @Query() query: AdminGetAdminActivitiesQueryDto
  ): Promise<PagedResponseDto<AdminActivityDto>> {
    return this.adminActivityService.getList(
      undefined,
      query.skip,
      query.take,
      query.filter
    );
  }

  @Get('/activities/:userID')
  @Roles(RolesEnum.ADMIN, RolesEnum.MODERATOR)
  @ApiOperation({
    description: 'Get list of admin activities'
  })
  @ApiOkResponse({
    type: AdminActivityDto,
    description: 'List of admin activities'
  })
  @ApiBadRequestResponse({
    description: 'Requested user is neither admin nor moderator'
  })
  getAdminActivities(
    @Param('userID', ParseIntSafePipe) userID: number,
    @Query() query: AdminGetAdminActivitiesQueryDto
  ): Promise<PagedResponseDto<AdminActivityDto>> {
    return this.adminActivityService.getList(
      userID,
      query.skip,
      query.take,
      query.filter
    );
  }
}
