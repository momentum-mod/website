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
    Query,
    UseGuards
} from '@nestjs/common';
import { AdminService } from './admin.service';
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
import { AdminUpdateUserDto, CreateUserDto, MergeUserDto, UserDto } from '@common/dto/user/user.dto';
import { ApiOkPaginatedResponse, PaginatedResponseDto } from '@common/dto/paginated-response.dto';
import { AdminGetReportsQuery } from '@common/dto/query/admin-queries.dto';
import { MapDto, UpdateMapDto } from '@common/dto/map/map.dto';
import { AdminCtlMapsGetAllQuery } from '@common/dto/query/map-queries.dto';
import { ReportDto, UpdateReportDto } from '@common/dto/report/report.dto';
import { Roles } from '@common/decorators/roles.decorator';
import { Roles as RolesEnum } from '../../common/enums/user.enum';
import { LoggedInUser } from '@common/decorators/logged-in-user.decorator';
import { XpSystemsService } from '@modules/xp-systems/xp-systems.service';
import { UpdateXpSystemsDto, XpSystemsDto } from '@common/dto/xp-systems/xp-systems.dto';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { NonGameAuthGuard } from '@modules/auth/guards/game-auth.guard';
import { ParseIntSafePipe } from '@common/pipes/parse-int-safe.pipe';
import { MapsService } from '../maps/maps.service';

@Controller('admin')
@UseGuards(RolesGuard)
@UseGuards(NonGameAuthGuard)
@Roles(RolesEnum.ADMIN)
@ApiTags('Admin')
@ApiBearerAuth()
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly xpSystems: XpSystemsService,
        private readonly mapsService: MapsService
    ) {}

    @Post('/users')
    @ApiBody({
        type: CreateUserDto,
        description: 'The alias of the placeholder user',
        required: true
    })
    @ApiOperation({ summary: 'Create a placeholder user' })
    @ApiOkResponse({ type: UserDto, description: 'The newly created user' })
    createPlaceholderUser(@Body() body: CreateUserDto): Promise<UserDto> {
        return this.adminService.createPlaceholderUser(body.alias);
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
    @ApiNotFoundResponse({ description: 'If either ID does not correspond to a user' })
    @ApiBadRequestResponse({ description: 'If the placeholder ID is not a placeholder' })
    mergeUsers(@Body() body: MergeUserDto): Promise<UserDto> {
        return this.adminService.mergeUsers(body.placeholderID, body.userID);
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
    deleteUser(@Param('userID', ParseIntSafePipe) userID: number) {
        return this.adminService.deleteUser(userID);
    }

    // This seems to only be used to reset all cosmetic or ranked XP.
    // Such a thing terrifies me, so lets leave it for now.
    @Patch('/user-stats')
    @ApiOperation({ summary: "Update every user's stats" })
    updateUserStats() {
        return void 0;
    }

    @Get('/maps')
    @ApiOperation({ description: 'Retrieve a list of maps' })
    @ApiOkPaginatedResponse(MapDto, { description: 'Paginated list of maps' })
    @ApiBadRequestResponse({ description: 'Invalid query data' })
    getMaps(
        @LoggedInUser('id') userID: number,
        @Query() query: AdminCtlMapsGetAllQuery
    ): Promise<PaginatedResponseDto<MapDto>> {
        return this.mapsService.getAll(userID, query);
    }

    @Patch('/maps/:mapID')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Update the target map's status flags" })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'ID of the map to update',
        required: true
    })
    @ApiBody({
        type: MapDto,
        description: 'The new status flags to update on the map',
        required: true
    })
    @ApiNoContentResponse({ description: 'The map was updated successfully' })
    @ApiBadRequestResponse({ description: 'Invalid map update data' })
    updateMap(
        @Param('mapID', ParseIntSafePipe) mapID: number,
        @LoggedInUser('id') userID: number,
        @Body() body: UpdateMapDto
    ) {
        return this.mapsService.update(mapID, userID, body, true);
    }

    @Delete('/maps/:mapID')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete the target map' })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'ID of the map to delete',
        required: true
    })
    @ApiNoContentResponse({ description: 'The map was deleted successfully' })
    deleteMap(@Param('mapID', ParseIntSafePipe) mapID: number) {
        return this.mapsService.delete(mapID);
    }

    @Get('/reports')
    @Roles(RolesEnum.ADMIN, RolesEnum.MODERATOR)
    @ApiOperation({ description: 'Retrieve a list of reports' })
    @ApiOkPaginatedResponse(ReportDto, { description: 'Paginated list of reports' })
    @ApiBadRequestResponse({ description: 'Invalid query data' })
    getReports(@Query() query: AdminGetReportsQuery): Promise<PaginatedResponseDto<ReportDto>> {
        return this.adminService.getReports(query.skip, query.take, query.resolved);
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

    @Get('/xpsys')
    @Roles(RolesEnum.ADMIN, RolesEnum.MODERATOR)
    @ApiOperation({ description: 'Retrives the current XP system variables' })
    @ApiOkResponse({ type: XpSystemsDto, description: 'The current XP system variables' })
    getXPSystems() {
        return this.xpSystems.get();
    }

    @Put('/xpsys')
    @Roles(RolesEnum.ADMIN)
    @ApiOperation({ description: 'Creates or Updates the current XP System variables' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiNoContentResponse({ description: 'The XP System variables were updated successfully' })
    @ApiBody({
        type: UpdateXpSystemsDto,
        description: 'The XP System variables to set',
        required: true
    })
    updateXPSystems(@Body() body: UpdateXpSystemsDto) {
        return this.xpSystems.update(body);
    }
}
