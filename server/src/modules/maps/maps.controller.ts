import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Res,
    UploadedFile,
    UseInterceptors,
    HttpCode,
    HttpStatus,
    BadRequestException,
    Patch,
    Delete
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiTags,
    ApiParam,
    ApiConsumes,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiConflictResponse,
    ApiBadRequestResponse,
    ApiForbiddenResponse,
    ApiNoContentResponse,
    ApiCreatedResponse
} from '@nestjs/swagger';
import { ApiOkPaginatedResponse, PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { MapsService } from './maps.service';
import { CreateMapDto, MapDto } from '../../common/dto/map/map.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { MapCreditsGetQuery, MapsCtlGetAllQuery, MapsGetQuery } from '../../common/dto/query/map-queries.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Roles as RolesEnum } from '../../common/enums/user.enum';
import { LoggedInUser } from '../../common/decorators/logged-in-user.decorator';
import { CreateMapCreditDto, MapCreditDto, UpdateMapCreditDto } from '../../common/dto/map/map-credit.dto';
import { MapInfoDto, UpdateMapInfoDto } from '../../common/dto/map/map-info.dto';
import { MapTrackDto } from '../../common/dto/map/map-track.dto';
import { MapsCtlRunsGetAllQuery } from '../../common/dto/query/run-queries.dto';
import { RunDto } from '../../common/dto/run/runs.dto';
import { RunsService } from '../runs/runs.service';

@ApiBearerAuth()
@Controller('api/v1/maps')
@ApiTags('Maps')
export class MapsController {
    constructor(private readonly mapsService: MapsService, private readonly runsService: RunsService) {}

    //#region Main Map Endpoints

    @Get()
    @ApiOperation({ summary: 'Returns all maps' })
    @ApiOkPaginatedResponse(MapDto, { description: 'Paginated list of maps' })
    getAllMaps(
        @LoggedInUser('id') userID: number,
        @Query() query?: MapsCtlGetAllQuery
    ): Promise<PaginatedResponseDto<MapDto>> {
        return this.mapsService.getAll(userID, query);
    }

    @Post()
    @HttpCode(HttpStatus.NO_CONTENT)
    @Roles(RolesEnum.MAPPER, RolesEnum.MODERATOR, RolesEnum.ADMIN)
    @ApiOperation({ summary: 'Creates a single map' })
    @ApiOkResponse({ type: MapDto, description: 'The newly created map' })
    @ApiForbiddenResponse({ description: 'User does not have the Mapper role' })
    @ApiBadRequestResponse({ description: 'Map object is invalid' })
    @ApiConflictResponse({ description: 'Map already exists' })
    @ApiConflictResponse({ description: 'Submitter has reached pending map limit' })
    @ApiBody({
        type: CreateMapDto,
        description: 'The create map data transfer object',
        required: true
    })
    async createMap(
        @Res({ passthrough: true }) res,
        @Body() body: CreateMapDto,
        @LoggedInUser('id') userID: number
    ): Promise<void> {
        const id = await this.mapsService.create(body, userID);

        MapsController.setMapUploadLocationHeader(res, id);
    }

    @Get('/:mapID')
    @ApiOperation({ summary: 'Returns a single map' })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'Target Map ID',
        required: true
    })
    @ApiOkResponse({ description: 'The found map' })
    @ApiNotFoundResponse({ description: 'Map was not found' })
    getMap(
        @LoggedInUser('id') userID: number,
        @Param('mapID', ParseIntPipe) mapID: number,
        @Query() query?: MapsGetQuery
    ): Promise<MapDto> {
        return this.mapsService.get(mapID, userID, query.expand);
    }

    //#endregion

    //#region Upload/Download

    @Get('/:mapID/upload')
    @Roles(RolesEnum.MAPPER)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Get the map upload endpoint in response header' })
    @ApiNoContentResponse({ description: 'The Location in header was set to the upload endpoint' })
    @ApiNotFoundResponse({ description: 'Map was not found' })
    @ApiForbiddenResponse({ description: 'User does not have the Mapper role' })
    @ApiForbiddenResponse({ description: 'User is not the submitter of the map' })
    @ApiForbiddenResponse({ description: 'Map is not in ACCEPTS_REVISION state' })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'Target Map ID',
        required: true
    })
    async getUploadLocation(
        @Res({ passthrough: true }) res,
        @LoggedInUser('id') userID: number,
        @Param('mapID', ParseIntPipe) mapID: number
    ): Promise<void> {
        await this.mapsService.canUploadMap(mapID, userID);

        MapsController.setMapUploadLocationHeader(res, mapID);
    }

    @Post('/:mapID/upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({ summary: 'Uploads a map' })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'Target Map ID',
        required: true
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary'
                }
            }
        }
    })
    @ApiOkResponse({ type: MapDto, description: 'The map object with updated downloadURL' })
    @ApiNotFoundResponse({ description: 'Map was not found' })
    @ApiForbiddenResponse({ description: 'User does not have the Mapper role' })
    @ApiForbiddenResponse({ description: 'User is not the submitter of the map' })
    @ApiForbiddenResponse({ description: 'Map is not in ACCEPTS_REVISION state' })
    uploadMap(
        @LoggedInUser('id') userID: number,
        @Param('mapID', ParseIntPipe) mapID: number,
        @UploadedFile() file: Express.Multer.File
    ): Promise<MapDto> {
        // We could do a great more validation here in the future using a custom pipe, probably when
        // we work on map submission. Anyone fancy writing a BSP parser in JS?
        if (!file || !file.buffer || !Buffer.isBuffer(file.buffer)) throw new BadRequestException('Map is not valid');

        return this.mapsService.upload(mapID, userID, file.buffer);
    }

    //#endregion

    //#region Credits

    @Get('/:mapID/credits')
    @ApiOperation({ summary: "Gets a single map's credits" })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'Target Map ID',
        required: true
    })
    @ApiOkPaginatedResponse(MapCreditDto, { description: "The found map's credits" })
    @ApiNotFoundResponse({ description: 'No map credits found' })
    @ApiNotFoundResponse({ description: 'Map not found' })
    getCredits(
        @Param('mapID', ParseIntPipe) mapID: number,
        @Query() query?: MapCreditsGetQuery
    ): Promise<MapCreditDto[]> {
        return this.mapsService.getCredits(mapID, query.expand);
    }

    @Post('/:mapID/credits')
    @Roles(RolesEnum.MAPPER)
    @ApiOperation({ summary: 'Adds a map credit to the map' })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'Target Map ID',
        required: true
    })
    @ApiCreatedResponse({ description: 'The newly added credit' })
    @ApiNotFoundResponse({ description: 'Map was not found' })
    @ApiForbiddenResponse({ description: 'User does not have the Mapper role' })
    @ApiForbiddenResponse({ description: 'User is not the submitter of the map' })
    @ApiForbiddenResponse({ description: 'Map is not in NEEDS_REVISION state' })
    @ApiBadRequestResponse({ description: 'Map credit object is invalid' })
    @ApiBadRequestResponse({ description: 'Credited user does not exist' })
    @ApiConflictResponse({ description: 'Map credit already exists' })
    @ApiBody({
        type: CreateMapCreditDto,
        description: 'The create map credit data transfer object',
        required: true
    })
    createCredit(
        @Param('mapID', ParseIntPipe) mapID: number,
        @Body() body: CreateMapCreditDto,
        @LoggedInUser('id') userID: number
    ): Promise<MapCreditDto> {
        return this.mapsService.createCredit(mapID, body, userID);
    }

    @Get('/credits/:mapCreditID')
    @ApiOperation({ summary: 'Gets a single map credit' })
    @ApiParam({
        name: 'mapCreditID',
        type: Number,
        description: 'Target credit ID',
        required: true
    })
    @ApiOkResponse({ description: 'The found map credit', type: MapCreditDto })
    @ApiNotFoundResponse({ description: 'Map credit not found' })
    getCredit(
        @Param('mapCreditID', ParseIntPipe) mapCreditID: number,
        @Query() query?: MapCreditsGetQuery
    ): Promise<MapCreditDto> {
        return this.mapsService.getCredit(mapCreditID, query.expand);
    }

    @Patch('/credits/:mapCreditID')
    @Roles(RolesEnum.MAPPER)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Updates the specified map credit' })
    @ApiParam({
        name: 'mapCreditID',
        type: Number,
        description: 'Target credit ID',
        required: true
    })
    @ApiBody({
        type: UpdateMapCreditDto,
        description: 'The create map credit data transfer object',
        required: true
    })
    @ApiNoContentResponse({ description: 'Map credit updated successfully' })
    @ApiBadRequestResponse({ description: 'Map credit object is invalid' })
    @ApiBadRequestResponse({ description: 'Credited user does not exist' })
    @ApiBadRequestResponse({ description: 'No update data provided' })
    @ApiForbiddenResponse({ description: 'Map is not in NEEDS_REVISION state' })
    @ApiForbiddenResponse({ description: 'User does not have the mapper role' })
    @ApiForbiddenResponse({ description: 'User is not the submitter of this map' })
    @ApiConflictResponse({ description: 'Cannot have duplicate map credits' })
    @ApiNotFoundResponse({ description: 'Map credit not found' })
    updateCredit(
        @Param('mapCreditID', ParseIntPipe) mapCreditID: number,
        @Body() body: UpdateMapCreditDto,
        @LoggedInUser('id') userID: number
    ): Promise<void> {
        return this.mapsService.updateCredit(mapCreditID, body, userID);
    }

    @Delete('/credits/:mapCreditID')
    @Roles(RolesEnum.MAPPER)
    @ApiOperation({ summary: 'Deletes the specified map credit' })
    @ApiParam({
        name: 'mapCreditID',
        type: Number,
        description: 'Target credit ID',
        required: true
    })
    @ApiOkResponse({ description: 'Map credit deleted successfully' })
    @ApiForbiddenResponse({ description: 'Map is not in NEEDS_REVISION state' })
    @ApiForbiddenResponse({ description: 'User does not have the mapper role' })
    @ApiForbiddenResponse({ description: 'User is not the submitter of this map' })
    @ApiNotFoundResponse({ description: 'Map credit not found' })
    deleteCredit(
        @Param('mapCreditID', ParseIntPipe) mapCreditID: number,
        @LoggedInUser('id') userID: number
    ): Promise<void> {
        return this.mapsService.deleteCredit(mapCreditID, userID);
    }

    //#endregion

    //#region Info

    @Get('/:mapID/info')
    @ApiOperation({ summary: "Gets a single map's info" })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'Target Map ID',
        required: true
    })
    @ApiOkResponse({ description: "The found map's info" })
    @ApiNotFoundResponse({ description: 'Map not found' })
    getInfo(@Param('mapID', ParseIntPipe) mapID: number): Promise<MapInfoDto> {
        return this.mapsService.getInfo(mapID);
    }

    @Patch('/:mapID/info')
    @Roles(RolesEnum.MAPPER)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Update the map info' })
    @ApiBody({
        type: UpdateMapInfoDto,
        description: 'Update map info data transfer object',
        required: true
    })
    @ApiNoContentResponse({ description: 'The map info was successfully updated' })
    @ApiBadRequestResponse({ description: 'Invalid update data' })
    @ApiForbiddenResponse({ description: 'Map is not in NEEDS_REVISION state' })
    @ApiForbiddenResponse({ description: 'User does not have the mapper role' })
    @ApiForbiddenResponse({ description: 'User is not the submitter of this map' })
    @ApiNotFoundResponse({ description: 'Map not found' })
    updateInfo(
        @LoggedInUser('id') userID: number,
        @Body() updateDto: UpdateMapInfoDto,
        @Param('mapID', ParseIntPipe) mapID: number
    ): Promise<void> {
        return this.mapsService.updateInfo(mapID, updateDto, userID);
    }

    //#endregion

    //#region Zones

    @Get('/:mapID/zones')
    @ApiOperation({ summary: "Gets a single map's zones" })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'Target Map ID',
        required: true
    })
    @ApiOkResponse({ description: "The found map's zones" })
    @ApiNotFoundResponse({ description: 'Map not found' })
    getZones(@Param('mapID', ParseIntPipe) mapID: number): Promise<MapTrackDto[]> {
        return this.mapsService.getZones(mapID);
    }
    //#endregion

    //#region Runs

    @Get('/:mapID/runs')
    @ApiOperation({ summary: 'Returns a paginated list of runs for a specific map' })
    @ApiParam({
        name: 'mapID',
        type: Number,
        description: 'Target Map ID',
        required: true
    })
    @ApiOkResponse({ description: "The found map's zones" })
    @ApiNotFoundResponse({ description: 'Map not found' })
    getRuns(
        @Param('mapID', ParseIntPipe) mapID: number,
        @Query() query?: MapsCtlRunsGetAllQuery
    ): Promise<PaginatedResponseDto<RunDto>> {
        return this.runsService.getAll(query);
    }

    //#endregion

    //#region Private

    // Frontend reads this header property and sends upload POST to that endpoint
    private static setMapUploadLocationHeader(res, mapID): void {
        res.set('Location', `api/v1/maps/${mapID}/upload`);
    }

    //#endregion
}
